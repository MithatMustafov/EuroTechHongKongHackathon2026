import { Injectable } from '@nestjs/common';
import { ComplianceCheckResult } from '../compliance.types';
import { AnalyzeInvoiceDto } from '../../invoice/dto/analyze-invoice.dto';

// Free webmail and consumer email providers — corporate suppliers should not use these
const GENERIC_PROVIDERS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.com.hk', 'yahoo.com.cn',
  'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
  'qq.com', '163.com', '126.com', 'sina.com', 'sohu.com', 'foxmail.com',
  'icloud.com', 'me.com', 'protonmail.com', 'tutanota.com',
  'yandex.com', 'yandex.ru', 'mail.ru',
]);

@Injectable()
export class EmailCoherenceCheck {
  async run(dto: AnalyzeInvoiceDto): Promise<ComplianceCheckResult> {
    const email = dto.supplier.email;

    if (!email) {
      return {
        check: 'EMAIL_COHERENCE',
        status: 'passed',
        detail: 'No supplier email provided — check not applicable',
        source: 'internal_ruleset',
      };
    }

    const atIndex = email.lastIndexOf('@');
    if (atIndex < 0) {
      return {
        check: 'EMAIL_COHERENCE',
        status: 'requires_review',
        detail: `Supplier email "${email}" has an invalid format`,
        source: 'internal_ruleset',
        email,
        is_generic_domain: false,
        domain_name_match: false,
      };
    }

    const domain = email.slice(atIndex + 1).toLowerCase();
    const isGeneric = GENERIC_PROVIDERS.has(domain);

    if (isGeneric) {
      return {
        check: 'EMAIL_COHERENCE',
        status: 'requires_review',
        detail: `Supplier email uses generic provider "${domain}" — corporate suppliers should use a company domain. Possible Business Email Compromise (BEC) risk.`,
        source: 'internal_ruleset',
        email,
        is_generic_domain: true,
        domain_name_match: false,
      };
    }

    // Check if the email domain relates to the supplier name
    const domainMatch = this.domainMatchesName(domain, dto.supplier.name);

    const abstractApiKey = process.env.ABSTRACT_API_KEY;
    let emailQualityScore: number | undefined;

    if (abstractApiKey) {
      try {
        const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${abstractApiKey}&email=${encodeURIComponent(email)}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json() as {
            quality_score?: string;
            is_valid_format?: { value: boolean };
            is_disposable_email?: { value: boolean };
            is_mx_found?: { value: boolean };
          };
          emailQualityScore = data.quality_score ? parseFloat(data.quality_score) : undefined;

          if (data.is_disposable_email?.value) {
            return {
              check: 'EMAIL_COHERENCE',
              status: 'requires_review',
              detail: `Supplier email "${email}" uses a disposable email service — high BEC risk`,
              source: 'abstractapi.com (email validation)',
              email,
              is_generic_domain: false,
              domain_name_match: domainMatch,
              email_quality_score: emailQualityScore,
            };
          }

          if (!data.is_mx_found?.value) {
            return {
              check: 'EMAIL_COHERENCE',
              status: 'requires_review',
              detail: `Supplier email domain "${domain}" has no valid MX records — email may not be deliverable`,
              source: 'abstractapi.com (email validation)',
              email,
              is_generic_domain: false,
              domain_name_match: domainMatch,
              email_quality_score: emailQualityScore,
            };
          }
        }
      } catch {
        // AbstractAPI unavailable — continue with rule-based only
      }
    }

    if (!domainMatch) {
      return {
        check: 'EMAIL_COHERENCE',
        status: 'requires_review',
        detail: `Email domain "${domain}" does not appear related to supplier name "${dto.supplier.name}" — verify sender identity`,
        source: `internal_ruleset${abstractApiKey ? ' + abstractapi.com' : ''}`,
        email,
        is_generic_domain: false,
        domain_name_match: false,
        email_quality_score: emailQualityScore,
      };
    }

    return {
      check: 'EMAIL_COHERENCE',
      status: 'passed',
      detail: `Supplier email domain "${domain}" is consistent with company name`,
      source: `internal_ruleset${abstractApiKey ? ' + abstractapi.com' : ''}`,
      email,
      is_generic_domain: false,
      domain_name_match: true,
      email_quality_score: emailQualityScore,
    };
  }

  private domainMatchesName(domain: string, supplierName: string): boolean {
    // Strip TLD and common suffixes, normalize
    const domainBase = domain
      .replace(/\.(com|cn|hk|net|org|co|com\.cn|com\.hk)$/, '')
      .replace(/[^a-z0-9]/g, ' ')
      .trim();

    const nameLower = supplierName.toLowerCase()
      .replace(/\b(co|ltd|llc|inc|corp|company|limited|co\.?ltd|gmbh|sdn|bhd|pvt|pte)\b/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .trim();

    // Extract meaningful words (> 3 chars) from both
    const domainWords = domainBase.split(/\s+/).filter(w => w.length > 3);
    const nameWords = nameLower.split(/\s+/).filter(w => w.length > 3);

    if (domainWords.length === 0 || nameWords.length === 0) return false;

    // Check if any domain word appears in name, or vice versa
    const domainSet = new Set(domainWords);
    const nameSet = new Set(nameWords);

    return [...domainSet].some(w => nameSet.has(w)) ||
           [...nameSet].some(w => domainBase.includes(w)) ||
           [...domainSet].some(w => nameLower.includes(w));
  }
}
