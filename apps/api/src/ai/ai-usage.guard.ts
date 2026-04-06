import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { AiUsageLog, AiFeature } from '../entities/ai-usage-log.entity';
import { Subscription } from '../entities/subscription.entity';
import { AI_FEATURE_KEY } from './decorators/ai-feature.decorator';

/** Monthly AI call caps per subscription plan */
const PLAN_CAPS: Record<string, number> = {
  starter:    50,
  pro:        200,
  accountant: 500,
  trialing:   200, // grace cap during trial — matches Pro
};

@Injectable()
export class AiUsageGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(AiUsageLog)
    private readonly usageRepo: Repository<AiUsageLog>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<AiFeature>(AI_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no @AiFeatureType decorator present, allow the request through
    if (!feature) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const businessId = req.user!.businessId;

    // ── Determine plan cap ───────────────────────────────────────────────────
    const subscription = await this.subscriptionRepo.findOne({
      where: { business_id: businessId },
    });

    let capKey = 'starter'; // default if no subscription record found
    if (subscription) {
      capKey =
        subscription.status === 'trialing' ? 'trialing' : subscription.plan;
    }
    const cap = PLAN_CAPS[capKey] ?? PLAN_CAPS.starter;

    // ── Count usage for current calendar month ───────────────────────────────
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const used = await this.usageRepo
      .createQueryBuilder('log')
      .where('log.business_id = :businessId', { businessId })
      .andWhere('log.used_at >= :monthStart', { monthStart })
      .getCount();

    if (used >= cap) {
      throw new HttpException(
        {
          error: 'AI usage limit reached for your plan. Please upgrade to continue.',
          feature,
          used,
          cap,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
