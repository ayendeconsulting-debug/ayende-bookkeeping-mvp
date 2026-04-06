/**
 * DTO for the Classification Learning endpoint.
 * Submitted when a user confirms they want to promote a manual
 * classification override into a reusable classification rule.
 */
export class LearnClassificationRuleDto {
  businessId: string;           // injected from req.user in controller
  rawTransactionId: string;     // source of the match_value (description)
  targetAccountId: string;      // the account the user classified to
  taxCodeId?: string;           // optional — carried over from classification
}
