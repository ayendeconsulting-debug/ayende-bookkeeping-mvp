import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { Subscription } from '../entities/subscription.entity';

/**
 * Phase 27.2 A-4: BillingGuard
 *
 * Server-side enforcement of subscription-state-based access control.
 *
 * Behaviour per subscription.status:
 *   - archived               -> HTTP 410 Gone on ALL methods
 *   - trial_expired_readonly -> HTTP 403 Forbidden on POST/PUT/PATCH/DELETE
 *                               (GET/HEAD/OPTIONS are allowed)
 *   - all other statuses     -> pass-through (trialing, active, past_due,
 *                               cancelled are gated by other layers)
 *
 * Exempt path prefixes (always allowed regardless of status):
 *   /billing   - user MUST be able to pay to reactivate
 *   /auth      - sign-in/sign-out must not be gated
 *   /admin     - platform admin bypass
 *   /health    - health checks from Railway and load balancers
 *   /webhooks  - public webhook endpoints (Stripe, Plaid)
 *
 * Registered globally via APP_GUARD in BillingModule. Runs after JwtAuthGuard,
 * so req.user.businessId is populated for authenticated routes. On public
 * routes (no req.user), we pass through silently - JwtAuthGuard already
 * decided whether auth was required.
 *
 * A-5 (daily transition cron, not yet shipped) is what actually flips
 * subscriptions INTO trial_expired_readonly and archived states. Until A-5
 * ships, this guard is dormant-but-ready: no production subscription row
 * currently has those statuses.
 */
@Injectable()
export class BillingGuard implements CanActivate {
  private readonly logger = new Logger(BillingGuard.name);

  private readonly exemptPrefixes = [
    '/billing',
    '/auth',
    '/admin',
    '/health',
    '/webhooks',
  ];

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    // 1. Exempt paths pass through regardless of status.
    const path = req.path ?? req.url ?? '';
    if (this.isExemptPath(path)) {
      return true;
    }

    // 2. Unauthenticated requests (public routes) pass through.
    //    JwtAuthGuard already decided whether auth was required.
    const businessId = req.user?.businessId;
    if (!businessId) {
      return true;
    }

    // 3. Look up subscription. Absence means the business is pre-subscription
    //    (fresh signup). The Next.js (app)/layout handles redirect to /pricing
    //    after the 7-day grace period from Phase 13 - not our concern.
    const subscription = await this.subscriptionRepo.findOne({
      where: { business_id: businessId },
    });
    if (!subscription) {
      return true;
    }

    const status = subscription.status;
    const method = (req.method ?? 'GET').toUpperCase();

    // 4. Archived: HTTP 410 Gone on every method.
    if (status === 'archived') {
      this.logger.warn(
        'Archived access blocked: business=' + businessId + ' ' + method + ' ' + path,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.GONE,
          error: 'Archived',
          message:
            'This workspace has been archived. Subscribe to reactivate your data.',
          reactivate_url: '/settings/billing',
        },
        HttpStatus.GONE,
      );
    }

    // 5. Read-only: block writes (POST/PUT/PATCH/DELETE), allow reads.
    if (status === 'trial_expired_readonly') {
      const isReadMethod =
        method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
      if (!isReadMethod) {
        this.logger.warn(
          'Read-only write blocked: business=' + businessId + ' ' + method + ' ' + path,
        );
        throw new ForbiddenException({
          statusCode: HttpStatus.FORBIDDEN,
          error: 'TrialExpiredReadOnly',
          message:
            'Your trial has ended. Subscribe to resume creating or editing data.',
          reactivate_url: '/settings/billing',
        });
      }
    }

    return true;
  }

  private isExemptPath(path: string): boolean {
    return this.exemptPrefixes.some(
      (prefix) => path === prefix || path.startsWith(prefix + '/'),
    );
  }
}
