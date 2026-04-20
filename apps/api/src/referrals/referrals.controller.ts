import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../admin/admin.guard';
import { ReferralsService } from './referrals.service';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  // ── Admin: Partner CRUD ───────────────────────────────────────────────

  @Get('partners')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  listPartners() {
    return this.referralsService.listPartners();
  }

  @Post('partners')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  createPartner(
    @Body()
    dto: {
      name: string;
      type: 'bank' | 'accountant' | 'user' | 'community';
      email: string;
      referral_code?: string;
      commission_type?: 'percentage' | 'flat';
      commission_value?: number;
      notes?: string;
    },
  ) {
    return this.referralsService.createPartner(dto);
  }

  @Get('partners/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  getPartner(@Param('id') id: string) {
    return this.referralsService.getPartner(id);
  }

  @Patch('partners/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  updatePartner(
    @Param('id') id: string,
    @Body()
    dto: {
      commission_type?: 'percentage' | 'flat';
      commission_value?: number;
      is_active?: boolean;
      notes?: string;
      email?: string;
    },
  ) {
    return this.referralsService.updatePartner(id, dto);
  }
}
