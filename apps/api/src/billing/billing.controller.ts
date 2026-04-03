import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  Headers,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { CreateCheckoutSessionDto, CreatePortalSessionDto } from './dto/billing.dto';
import { Public } from '../auth/public.decorator';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * POST /billing/create-checkout-session
   * Create a Stripe Checkout session for a subscription trial.
   * Card collected upfront — no charge during 60-day trial.
   * Auto-activates Starter plan after trial unless user cancels.
   */
  @Post('create-checkout-session')
  @HttpCode(HttpStatus.OK)
  async createCheckoutSession(
    @Req() req: Request,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.billingService.createCheckoutSession(
      req.user!.businessId,
      req.user!.userId,
      dto,
    );
  }

  /**
   * POST /billing/create-portal-session
   * Create a Stripe Customer Portal session for subscription management.
   */
  @Post('create-portal-session')
  @HttpCode(HttpStatus.OK)
  async createPortalSession(
    @Req() req: Request,
    @Body() dto: CreatePortalSessionDto,
  ) {
    return this.billingService.createPortalSession(
      req.user!.businessId,
      dto.return_url,
    );
  }

  /**
   * GET /billing/subscription
   * Return current subscription status for the authenticated business.
   */
  @Get('subscription')
  async getSubscription(@Req() req: Request) {
    return this.billingService.getSubscription(req.user!.businessId);
  }

  /**
   * POST /billing/webhook
   * Stripe webhook endpoint — bypasses JWT auth via @Public().
   * Validates Stripe-Signature header before processing any event.
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new Error('Raw body not available — ensure rawBody: true in NestFactory.create');
    }
    await this.billingService.handleWebhook(rawBody, signature);
    return { received: true };
  }
}
