import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AdminGuard } from '../admin/admin.guard';
import { Public } from '../auth/public.decorator';
import { LeadsService, CreateLeadDto, UpdateLeadDto } from './leads.service';
import { LeadStatus } from './lead.entity';

// ── Admin: full CRUD behind AdminGuard ───────────────────────────────────────

@Controller('admin/leads')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminLeadsController {
  constructor(private readonly service: LeadsService) {}

  /** GET /admin/leads?status=new */
  @Get()
  findAll(@Query('status') status?: LeadStatus) {
    return this.service.findAll(status);
  }

  /** POST /admin/leads */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateLeadDto) {
    return this.service.upsert(dto);
  }

  /** POST /admin/leads/import — JSON rows parsed from CSV on frontend */
  @Post('import')
  @HttpCode(HttpStatus.OK)
  import(@Body() body: { rows: CreateLeadDto[] }) {
    return this.service.importCsv(body.rows ?? []);
  }

  /** PATCH /admin/leads/:id */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.service.update(id, dto);
  }

  /** DELETE /admin/leads/:id — soft delete */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  softDelete(@Param('id') id: string) {
    return this.service.softDelete(id);
  }
}

// ── Public: marketing form submission ────────────────────────────────────────

@Controller('public/leads')
export class PublicLeadsController {
  constructor(private readonly service: LeadsService) {}

  /**
   * POST /public/leads
   * No auth required. Rate-limited to 5 requests per IP per hour.
   * Decorated with @Public() to bypass the global JwtAuthGuard.
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  submitForm(
    @Body()
    body: CreateLeadDto & {
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
    },
  ) {
    return this.service.upsert({
      ...body,
      source: 'marketing_form',
    });
  }
}
