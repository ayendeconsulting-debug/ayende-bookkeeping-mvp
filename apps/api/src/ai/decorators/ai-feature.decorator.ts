import { SetMetadata } from '@nestjs/common';
import { AiFeature } from '../../entities/ai-usage-log.entity';

export const AI_FEATURE_KEY = 'ai_feature';

/**
 * Decorator applied to AI controller methods to identify which feature
 * is being invoked. Used by AiUsageGuard to log and enforce plan caps.
 *
 * Usage:
 *   @AiFeatureType(AiFeature.CLASSIFY)
 *   @Post('classify/:rawTransactionId')
 *   async classify(...) {}
 */
export const AiFeatureType = (feature: AiFeature) =>
  SetMetadata(AI_FEATURE_KEY, feature);
