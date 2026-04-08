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
import { Business } from '../entities/business.entity';
import { AiUsageService } from './services/ai-usage.service';
import { AI_FEATURE_KEY } from './decorators/ai-feature.decorator';

/** Monthly AI call caps per subscription plan */
const PLAN_CAPS: Record<string, number> = {
  starter:    50,
  pro:        200,
  accountant: 500,
  trialing:   200, // grace cap during trial – matches Pro
};

@Injectable()
export class AiUsageGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly aiUsageService: AiUsageService,
    @InjectRepository(AiUsageLog)
    private readonly usageRepo: Repository<AiUsageLog>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
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

    // ── Determine plan ────────────────────────────────────────────────────────
    const subscription = await this.subscriptionRepo.findOne({
      where: { business_id: businessId },
    });

    let capKey = 'starter';
    if (subscription) {
      capKey = subscription.status === 'trialing' ? 'trialing' : subscription.plan;
    }
    const cap = PLAN_CAPS[capKey] ?? PLAN_CAPS.starter;
    const monthStart = this.aiUsageService.getCurrentMonthStart();

    // ── Phase 15: Firm-wide cap for Accountant plan ───────────────────────────
    if (capKey === 'accountant') {
      const business = await this.businessRepo.findOne({
        where: { id: businessId },
        select: ['id', 'created_by_firm_id'],
      });

      if (business?.created_by_firm_id) {
        const firmUsage = await this.aiUsageService.getFirmUsage(
          business.created_by_firm_id,
          monthStart,
        );

        if (firmUsage.used >= firmUsage.cap) {
          throw new HttpException(
            {
              error: 'Your firm has reached its monthly AI usage limit. Please upgrade to continue.',
              feature,
              used: firmUsage.used,
              cap: firmUsage.cap,
              scope: 'firm',
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        // In-flight jobs complete — cap only blocks new submissions
        return true;
      }
    }

    // ── Per-business cap (all other plans) ────────────────────────────────────
    const used = await this.aiUsageService.getBusinessUsage(businessId, monthStart);

    if (used >= cap) {
      throw new HttpException(
        {
          error: 'AI usage limit reached for your plan. Please upgrade to continue.',
          feature,
          used,
          cap,
          scope: 'business',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
