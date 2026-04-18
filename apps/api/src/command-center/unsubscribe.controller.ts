import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { ConfigService } from '@nestjs/config';
import { EmailPreferencesService, PreferenceFlags } from './email-preferences.service';
import { verifyToken } from './unsubscribe.helper';

interface SavePreferencesDto {
  token: string;
  unsubscribe_tips?: boolean;
  unsubscribe_broadcasts?: boolean;
  unsubscribe_partnership?: boolean;
  unsubscribe_cold?: boolean;
  unsubscribed_all?: boolean;
}

@Controller('unsubscribe')
export class UnsubscribeController {
  private readonly logger = new Logger(UnsubscribeController.name);

  constructor(
    private readonly prefsService: EmailPreferencesService,
    private readonly configService: ConfigService,
  ) {}

  // ── GET /unsubscribe?token= ── return current preferences ──────────────────
  @Public()
  @Get()
  async getPreferences(@Query('token') token: string) {
    const secret = this.configService.get<string>('UNSUBSCRIBE_SECRET') ?? '';
    const email  = verifyToken(token, secret);
    if (!email) throw new BadRequestException('Invalid unsubscribe token');

    const prefs = await this.prefsService.getPreferences(email);
    return { email, ...prefs };
  }

  // ── POST /unsubscribe ── save updated preferences ──────────────────────────
  @Public()
  @Post()
  async savePreferences(@Body() body: SavePreferencesDto) {
    const secret = this.configService.get<string>('UNSUBSCRIBE_SECRET') ?? '';
    const email  = verifyToken(body.token, secret);
    if (!email) throw new BadRequestException('Invalid unsubscribe token');

    const flags: PreferenceFlags = {
      unsubscribe_tips:        body.unsubscribe_tips        ?? false,
      unsubscribe_broadcasts:  body.unsubscribe_broadcasts  ?? false,
      unsubscribe_partnership: body.unsubscribe_partnership ?? false,
      unsubscribe_cold:        body.unsubscribe_cold        ?? false,
      unsubscribed_all:        body.unsubscribed_all        ?? false,
    };

    await this.prefsService.upsertPreferences(email, flags);
    this.logger.log(`Preferences updated for ${email}`);
    return { success: true };
  }
}
