/**
 * formatRailLabel — single source of truth for turning a rail identifier into
 * a display string. Replaces the three separate formatRail / formatRailForSentence
 * / formatRailForButton functions that previously existed across two services.
 *
 * variant:
 *   'short'    → used in structured output, logging, summaries  (default)
 *   'sentence' → grammatically natural mid-sentence label
 *   'button'   → compact label for UI action buttons
 */
export function formatRailLabel(
  rail: string,
  variant: 'short' | 'sentence' | 'button' = 'short',
): string {
  switch (rail) {
    case 'FPS':
      return 'FPS';
    case 'CHATS_RTGS':
      return variant === 'short' ? 'CHATS RTGS' : 'CHATS/RTGS';
    case 'CIPS':
      return 'CIPS';
    case 'SWIFT':
      return 'SWIFT';
    case 'STABLECOIN':
      if (variant === 'button') return 'stablecoin';
      if (variant === 'sentence') return 'stablecoin payment';
      return 'stablecoin rail';
    case 'BANK_TRANSFER':
      return 'bank transfer';
    case 'NONE':
      return variant === 'button' ? 'payment' : 'no payment rail';
    default:
      return rail;
  }
}
