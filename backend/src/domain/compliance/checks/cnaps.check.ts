import { Injectable } from '@nestjs/common';
import { ComplianceCheckResult } from '../compliance.types';
import { AnalyzeInvoiceDto } from '../../../application/invoice/dto/analyze-invoice.dto';

// First 3 digits of a CNAPS code identify the bank institution
const CNAPS_BANK_PREFIXES: Record<string, string> = {
  '102': 'Industrial and Commercial Bank of China (ICBC)',
  '103': 'Agricultural Bank of China (ABC)',
  '104': 'Bank of China (BOC)',
  '105': 'China Construction Bank (CCB)',
  '121': 'Bank of Shanghai',
  '122': 'Bank of Hangzhou',
  '131': 'Bank of Beijing',
  '201': 'China Development Bank',
  '203': 'Agricultural Development Bank of China',
  '301': 'Bank of Communications',
  '302': 'CITIC Bank',
  '303': 'China Everbright Bank',
  '304': 'Hua Xia Bank',
  '305': 'Guangdong Development Bank',
  '306': 'Ping An Bank',
  '308': 'China Merchants Bank',
  '309': 'China Minsheng Bank',
  '310': 'China Guangfa Bank',
  '313': 'Bank of Beijing',
  '315': 'Industrial Bank',
  '316': 'China Zheshang Bank',
  '318': 'Postal Savings Bank of China',
  '319': 'China Bohai Bank',
  '320': 'Hengfeng Bank',
  '322': 'Shengjing Bank',
  '403': 'Export-Import Bank of China',
  '501': 'HSBC China',
  '502': 'Citibank China',
  '503': 'Deutsche Bank China',
  '524': 'Standard Chartered China',
  '525': 'Bank of East Asia China',
  '526': 'DBS Bank China',
  '527': 'Hang Seng Bank China',
};

// Key words that identify a bank match (normalized lowercase)
const BANK_KEY_WORDS: Record<string, string[]> = {
  '102': ['icbc', 'industrial', 'commercial'],
  '103': ['agricultural', 'abc'],
  '104': ['bank of china', 'boc'],
  '105': ['construction', 'ccb'],
  '301': ['communications'],
  '302': ['citic'],
  '303': ['everbright'],
  '304': ['hua xia'],
  '305': ['guangdong development'],
  '306': ['ping an'],
  '308': ['merchants'],
  '309': ['minsheng'],
  '310': ['guangfa'],
  '315': ['industrial bank'],
  '318': ['postal', 'savings'],
  '501': ['hsbc'],
  '502': ['citi'],
  '503': ['deutsche'],
  '524': ['standard chartered'],
  '525': ['bank of east asia', 'bea'],
  '526': ['dbs'],
};

// Banks confirmed as CIPS (Cross-Border Interbank Payment System) direct participants
const CIPS_DIRECT_PARTICIPANTS = new Set([
  '102', '103', '104', '105', '301', '302', '303', '306', '308', '309', '315', '318', '501', '502', '503', '524', '525', '526',
]);

@Injectable()
export class CnapsCheck {
  async run(dto: AnalyzeInvoiceDto): Promise<ComplianceCheckResult> {
    const cnapsCode = dto.payment.destination?.cnaps_code;
    const statedBank = dto.payment.destination?.bank_name ?? '';

    if (!cnapsCode) {
      return {
        check: 'CNAPS_VALIDATION',
        status: 'passed',
        detail: 'No CNAPS code in invoice — check not applicable',
        source: 'internal_ruleset',
      };
    }

    // Format check: exactly 12 digits
    if (!/^\d{12}$/.test(cnapsCode)) {
      return {
        check: 'CNAPS_VALIDATION',
        status: 'failed',
        detail: `CNAPS code "${cnapsCode}" is not valid — must be exactly 12 digits`,
        source: 'internal_ruleset',
        cnaps_code: cnapsCode,
        cnaps_stated_bank: statedBank,
      };
    }

    const prefix = cnapsCode.slice(0, 3);
    const cnapsBank = CNAPS_BANK_PREFIXES[prefix];

    if (!cnapsBank) {
      return {
        check: 'CNAPS_VALIDATION',
        status: 'requires_review',
        detail: `CNAPS code has unknown bank prefix "${prefix}" — verify bank identity manually`,
        source: 'internal_ruleset',
        cnaps_code: cnapsCode,
        cnaps_bank_from_code: undefined,
        cnaps_stated_bank: statedBank,
      };
    }

    const bankMatch = this.bankNamesMatch(prefix, statedBank);
    const isCipsParticipant = CIPS_DIRECT_PARTICIPANTS.has(prefix);

    if (!bankMatch && statedBank) {
      return {
        check: 'CNAPS_VALIDATION',
        status: 'requires_review',
        detail: `CNAPS prefix "${prefix}" maps to ${cnapsBank}, but invoice states "${statedBank}" — possible bank name mismatch; verify before payment`,
        source: 'internal_ruleset',
        cnaps_code: cnapsCode,
        cnaps_bank_from_code: cnapsBank,
        cnaps_stated_bank: statedBank,
        cnaps_bank_match: false,
        cips_participant: isCipsParticipant,
      };
    }

    return {
      check: 'CNAPS_VALIDATION',
      status: 'passed',
      detail: `CNAPS code valid — ${cnapsBank}${isCipsParticipant ? ' (CIPS direct participant)' : ''}`,
      source: 'internal_ruleset',
      cnaps_code: cnapsCode,
      cnaps_bank_from_code: cnapsBank,
      cnaps_stated_bank: statedBank,
      cnaps_bank_match: true,
      cips_participant: isCipsParticipant,
    };
  }

  private bankNamesMatch(prefix: string, statedBank: string): boolean {
    if (!statedBank) return true;
    const normalized = statedBank.toLowerCase();

    // Step 1: if the stated name contains a DIFFERENT bank's distinctive keyword, it's a mismatch.
    // Use only long, unambiguous keywords to avoid false triggers (exclude generic phrases like "bank of china"
    // which appears as a substring inside "Industrial and Commercial Bank of China").
    const AMBIGUOUS = new Set(['bank of china']);
    for (const [otherPrefix, keywords] of Object.entries(BANK_KEY_WORDS)) {
      if (otherPrefix === prefix) continue;
      const distinctive = keywords.filter(k => k.length >= 7 && !AMBIGUOUS.has(k));
      if (distinctive.some(k => normalized.includes(k))) return false;
    }

    // Step 2: check this bank's own keywords
    const ownKeywords = BANK_KEY_WORDS[prefix];
    if (!ownKeywords) return true;
    return ownKeywords.some(kw => normalized.includes(kw));
  }
}
