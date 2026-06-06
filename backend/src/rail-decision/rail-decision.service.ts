import { Injectable } from '@nestjs/common';
import type { Invoice } from '../common/types/invoice.types';
import type { RailDecision } from './rail-decision.types';

@Injectable()
export class RailDecisionService {
  decideRail(invoice: Invoice): RailDecision {
    void invoice;

    return {
      recommended_rail: 'NONE',
      summary: '',
      rail_options: [],
    };
  }
}
