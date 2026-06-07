import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { OpenRouter } from '@openrouter/sdk';
import { AnalyzeInvoiceDto } from '../invoice/dto/analyze-invoice.dto';
import { AuditInvoiceDto } from '../invoice/dto/audit-invoice.dto';

type GoodsClassification = 'unrestricted' | 'requires_review' | 'restricted';

@Injectable()
export class AiService {
  private readonly client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  private readonly openrouter = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY ?? '' });

  async classifyGoods(purpose: string): Promise<GoodsClassification> {
    const msg = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 20,
      system: 'You are a trade compliance classifier. Respond with ONLY one word: unrestricted, requires_review, or restricted.',
      messages: [{
        role: 'user',
        content: `Classify this payment purpose for export compliance:\n\n"${purpose}"\n\n- unrestricted: standard goods, raw materials, components, services\n- requires_review: electronics, technology, software, dual-use items, military-grade equipment\n- restricted: weapons, explosives, narcotics, nuclear materials, ITAR-controlled items`,
      }],
    });

    const text = (msg.content[0] as { text: string }).text.trim().toLowerCase();
    if (text.includes('restricted') && !text.includes('unrestricted') && !text.includes('requires')) {
      return 'restricted';
    }
    if (text.includes('requires_review') || text.includes('requires review')) return 'requires_review';
    if (text.includes('unrestricted')) return 'unrestricted';
    return 'requires_review';
  }

  async extractInvoiceFields(base64: string, mediaType = 'image/jpeg'): Promise<Partial<AnalyzeInvoiceDto>> {
    const msg = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64,
            },
          },
          {
            type: 'text',
            text: `Extract invoice fields and return ONLY valid JSON matching this schema (omit fields you cannot read):
{
  "invoice_number": "...",
  "due_date": "YYYY-MM-DD",
  "supplier": { "name": "...", "country": "...", "email": "..." },
  "payment": {
    "amount": 0,
    "currency": "CNY",
    "purpose": "...",
    "beneficiary_name": "...",
    "destination": { "bank_name": "...", "account_number": "...", "cnaps_code": "..." }
  }
}`,
          },
        ],
      }],
    });

    const text = (msg.content[0] as { type: 'text'; text: string }).text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found in extraction response');
    return JSON.parse(match[0]) as Partial<AnalyzeInvoiceDto>;
  }

  async generateAuditSummary(dto: AuditInvoiceDto): Promise<string> {
    if (!process.env.OPENROUTER_API_KEY) return buildExampleSummary(dto);

    try {
      const result = await this.openrouter.chat.send({
        chatRequest: {
          model: 'moonshotai/kimi-k2.6:free',
          maxTokens: 256,
          stream: false,
          messages: [
            {
              role: 'system',
              content:
                'You are PayRouter, a senior compliance and payments analyst. ' +
                'Write a concise 3–4 sentence audit summary covering fraud risk, ' +
                'compliance outcome, and rail selection. Be direct and professional. ' +
                'Do not use bullet points or headers — plain prose only.',
            },
            { role: 'user', content: buildAuditPrompt(dto) },
          ] as any,
        },
      });

      const content = result.choices[0]?.message?.content;
      if (typeof content === 'string' && content.trim()) return content.trim();
      throw new Error('Empty response from model');
    } catch (err) {
      console.error('[PayRouter] OpenRouter audit call failed:', err);
      return buildExampleSummary(dto);
    }
  }
}

// ── Prompt builder (ready for the LLM call above) ─────────────────────────────

function buildAuditPrompt(dto: AuditInvoiceDto): string {
  const checks = (dto.compliance_checks ?? [])
    .map((c) => `  - ${c.check}: ${c.status} — ${c.detail}`)
    .join('\n') || '  (none)';

  return [
    'Audit the following payment and write a 3–4 sentence summary covering',
    'fraud risk, compliance outcome, and rail selection.',
    '',
    `Invoice:  ${dto.invoice_number}`,
    `Supplier: ${dto.supplier_name} (${dto.supplier_country})`,
    `Amount:   ${dto.amount} ${dto.currency}`,
    '',
    `Fraud:    score=${dto.fraud_score}/100  level=${dto.fraud_level}`,
    `Signals:  ${dto.fraud_reasons.length ? dto.fraud_reasons.join(', ') : 'none'}`,
    '',
    `Compliance: ${dto.compliance_status}`,
    `Checks:\n${checks}`,
    '',
    `Recommended rail: ${dto.recommended_rail}`,
    `Reason: ${dto.rail_reason}`,
    `Payment held: ${dto.held}`,
  ].join('\n');
}

// ── Example summary (placeholder until live LLM call is enabled) ──────────────

function buildExampleSummary(dto: AuditInvoiceDto): string {
  const riskLabel =
    dto.fraud_level === 'low'
      ? 'low'
      : dto.fraud_level === 'high' || dto.fraud_level === 'critical'
        ? 'elevated'
        : 'moderate';

  const fraudLine =
    dto.fraud_reasons.length
      ? `Fraud analysis returned a ${riskLabel} risk score of ${dto.fraud_score}/100, ` +
        `with signals including ${dto.fraud_reasons.slice(0, 2).join(' and ')}.`
      : `Fraud analysis returned a ${riskLabel} risk score of ${dto.fraud_score}/100 ` +
        `with no material signals detected.`;

  const failedChecks = (dto.compliance_checks ?? []).filter((c) => c.status === 'failed');
  const complianceLine =
    failedChecks.length
      ? `Compliance review flagged ${failedChecks.length} issue${failedChecks.length > 1 ? 's' : ''}: ` +
        `${failedChecks.map((c) => c.check).join(', ')}, requiring attention before release.`
      : `All ${(dto.compliance_checks ?? []).length} compliance checks passed, including sanctions screening, ` +
        `jurisdiction approval, and goods classification.`;

  const railLine =
    `${dto.recommended_rail} is the recommended settlement rail for this ${dto.currency} payment — ` +
    `${dto.rail_reason.charAt(0).toLowerCase()}${dto.rail_reason.slice(1)}.`;

  const verdict = dto.held
    ? `Overall, this payment has been placed on hold pending compliance review and manual authorization before release.`
    : `Overall, this transfer is cleared for processing and may proceed via the selected rail subject to standard authorization.`;

  return [fraudLine, complianceLine, railLine, verdict].join(' ');
}
