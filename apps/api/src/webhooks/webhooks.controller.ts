import {
  Controller, Post, Req, HttpCode, HttpStatus,
  BadRequestException, Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Webhook } from 'svix';
import { Resend } from 'resend';
import { Public } from '../auth/public.decorator';
import { AutomationsService } from '../command-center/automations.service';

interface ClerkEmailAddress {
  email_address: string;
  id: string;
}

interface ClerkUserCreatedData {
  id: string;
  email_addresses: ClerkEmailAddress[];
  first_name: string | null;
  last_name: string | null;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserCreatedData;
}

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  private readonly wh: Webhook;
  private readonly resend: Resend;
  private readonly adminEmail: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly automationsService: AutomationsService,
  ) {
    const secret = this.configService.get<string>('CLERK_WEBHOOK_SECRET') ?? '';
    this.wh = new Webhook(secret);
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    this.adminEmail =
      this.configService.get<string>('ADMIN_EMAIL') ?? 'admin@gettempo.ca';
  }

  /**
   * POST /webhooks/clerk
   * Public — secured by svix signature verification only.
   * Handles Clerk user lifecycle events.
   */
  @Public()
  @Post('clerk')
  @HttpCode(HttpStatus.OK)
  async handleClerkWebhook(
    @Req() req: Request & { rawBody?: Buffer },
  ): Promise<{ received: boolean }> {
    const svixId        = req.headers['svix-id']        as string | undefined;
    const svixTimestamp = req.headers['svix-timestamp'] as string | undefined;
    const svixSignature = req.headers['svix-signature'] as string | undefined;

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new BadRequestException('Missing svix signature headers');
    }

    let evt: ClerkWebhookEvent;
    try {
      evt = this.wh.verify(req.rawBody ?? Buffer.from(''), {
        'svix-id':        svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkWebhookEvent;
    } catch (err) {
      this.logger.warn(
        `Clerk webhook signature verification failed: ${(err as Error).message}`,
      );
      throw new BadRequestException('Invalid webhook signature');
    }

    if (evt.type === 'user.created') {
      await this.handleUserCreated(evt.data);
    }

    return { received: true };
  }

  // ── user.created ──────────────────────────────────────────────────────────
  private async handleUserCreated(data: ClerkUserCreatedData): Promise<void> {
    const email     = data.email_addresses?.[0]?.email_address ?? '';
    const firstName = data.first_name ?? '';
    const lastName  = data.last_name  ?? '';
    const fullName  = [firstName, lastName].filter(Boolean).join(' ');

    if (!email) {
      this.logger.warn('user.created event received with no email — skipping');
      return;
    }

    this.logger.log(`New signup: ${fullName} (${email})`);

    // 1 ── Fire automation rules (e.g. signup_welcome template if configured)
    try {
      await this.automationsService.fireRules('user.created', {
        email,
        first_name:    firstName,
        last_name:     lastName,
        business_name: fullName,
      });
    } catch (err) {
      this.logger.error(
        `Automation rules failed for user.created (${email}): ${(err as Error).message}`,
      );
    }

    // 2 ── Hardwired admin alert — always fires regardless of automation rules
    try {
      await this.resend.emails.send({
        from: 'Tempo Books <noreply@gettempo.ca>',
        to:   this.adminEmail,
        subject: `New signup \u2014 ${fullName} (${email})`,
        html: this.buildAdminAlertHtml(fullName, email),
      });
      this.logger.log(`Admin signup alert sent for ${email}`);
    } catch (err) {
      this.logger.error(
        `Admin alert failed for ${email}: ${(err as Error).message}`,
      );
    }
  }

  // ── Admin alert HTML ──────────────────────────────────────────────────────
  private buildAdminAlertHtml(name: string, email: string): string {
    const now = new Date().toLocaleString('en-CA', {
      timeZone: 'America/Toronto',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:#1B3A5C;padding:24px 40px;">
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:bold;">Tempo Books &mdash; New Signup</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 20px;font-size:15px;color:#374151;">A new user has signed up for Tempo Books.</p>
          <table cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:20px;width:100%;box-sizing:border-box;">
            <tr><td style="padding-bottom:16px;">
              <p style="margin:0 0 4px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Name</p>
              <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">${name || '(not provided)'}</p>
            </td></tr>
            <tr><td style="padding-bottom:16px;">
              <p style="margin:0 0 4px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Email</p>
              <p style="margin:0;font-size:16px;color:#111827;">${email}</p>
            </td></tr>
            <tr><td>
              <p style="margin:0 0 4px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Signed up</p>
              <p style="margin:0;font-size:15px;color:#111827;">${now} ET</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Tempo Books &mdash; gettempo.ca &mdash; Admin Notification</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
