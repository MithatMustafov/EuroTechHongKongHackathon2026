import { Injectable } from '@nestjs/common';
import { ComplianceCheckResult } from '../compliance.types';
import { AnalyzeInvoiceDto } from '../../invoice/dto/analyze-invoice.dto';
import { AiService } from '../../ai/ai.service';

type GoodsClassification = 'unrestricted' | 'requires_review' | 'restricted';

const RESTRICTED_KEYWORDS = [
  'weapon', 'weapons', 'arms', 'ammunition', 'explosives', 'explosive',
  'nuclear', 'chemical weapon', 'biological weapon', 'narcotics', 'drugs',
  'missile', 'warhead', 'landmine', 'cluster bomb', 'radiological',
];

const REVIEW_KEYWORDS = [
  'military', 'defense', 'defence', 'dual-use', 'surveillance',
  'encryption device', 'radar', 'sonar', 'thermal imaging',
  'night vision', 'satellite', 'unmanned aerial', 'semiconductor fab',
  'centrifuge', 'turbine engine',
];

@Injectable()
export class GoodsCategoryCheck {
  constructor(private readonly aiService: AiService) {}

  async run(dto: AnalyzeInvoiceDto): Promise<ComplianceCheckResult> {
    const purpose = (dto.payment.purpose ?? '').toLowerCase();

    if (RESTRICTED_KEYWORDS.some(k => purpose.includes(k))) {
      return this.build('restricted', 'keyword', 'Payment purpose matches restricted goods keyword');
    }

    if (REVIEW_KEYWORDS.some(k => purpose.includes(k))) {
      return this.build('requires_review', 'keyword', 'Payment purpose matched dual-use or controlled-technology keyword');
    }

    const classification = await this.aiService
      .classifyGoods(dto.payment.purpose)
      .catch(() => 'requires_review' as GoodsClassification);

    const detail =
      classification === 'unrestricted'
        ? 'Standard goods/services — no trade restrictions identified'
        : classification === 'requires_review'
          ? 'Goods classification requires review (potential dual-use or technology category)'
          : 'Goods classified as restricted — payment blocked';

    return this.build(classification, 'ai', detail);
  }

  private build(
    classification: GoodsClassification,
    classifiedBy: 'keyword' | 'ai',
    detail: string,
  ): ComplianceCheckResult {
    const status: ComplianceCheckResult['status'] =
      classification === 'unrestricted' ? 'passed' :
      classification === 'requires_review' ? 'requires_review' : 'failed';

    return {
      check: 'GOODS_CATEGORY',
      status,
      detail,
      source: classifiedBy === 'keyword' ? 'keyword_ruleset' : 'claude_nlp',
      classification,
      classified_by: classifiedBy,
    };
  }
}
