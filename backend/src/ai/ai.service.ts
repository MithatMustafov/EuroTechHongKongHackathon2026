import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AnalyzeInvoiceDto } from '../invoice/dto/analyze-invoice.dto';

type GoodsClassification = 'unrestricted' | 'requires_review' | 'restricted';

@Injectable()
export class AiService {
  private readonly client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
}
