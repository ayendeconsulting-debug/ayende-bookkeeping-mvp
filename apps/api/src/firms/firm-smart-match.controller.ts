import { Controller, Post, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { FirmsService } from './firms.service';
import { FirmSmartMatchService } from './firm-smart-match.service';

/**
 * Phase 34j: Firm-wide Smart Match endpoints.
 *
 * POST /firms/smart-match/run    — Trigger Smart Match for all active clients.
 * GET  /firms/smart-match/status — Poll latest run for the progress banner.
 *
 * Auth: requires valid Clerk session (JwtAuthGuard, global).
 * Firm gate: FirmsService.getMyFirm() resolves and validates firm membership.
 * No @Roles decorator — firm membership itself is the authorization boundary.
 */
@Controller('firms/smart-match')
export class FirmSmartMatchController {
  constructor(
    private readonly firmsService: FirmsService,
    private readonly firmSmartMatchService: FirmSmartMatchService,
  ) {}

  /**
   * POST /firms/smart-match/run
   *
   * Enqueues one smart-match-batch job per active client under the firm.
   * Creates a FirmSmartMatchRun tracking row.
   *
   * Returns: { run_id, client_count, queued: true }
   */
  @Post('run')
  async run(@Req() req: Request) {
    const firm = await this.firmsService.getMyFirm(req.user!.userId);
    const run = await this.firmSmartMatchService.runFirmSmartMatch(
      firm.id,
      req.user!.userId,
    );
    return {
      run_id: run.id,
      client_count: run.client_count,
      queued: true,
    };
  }

  /**
   * GET /firms/smart-match/status
   *
   * Returns the latest FirmSmartMatchRun for the firm, or null if none.
   * Polled every 3 seconds by the Accountant Portal progress banner (34k).
   */
  @Get('status')
  async status(@Req() req: Request) {
    const firm = await this.firmsService.getMyFirm(req.user!.userId);
    const run = await this.firmSmartMatchService.getLatestRun(firm.id);
    return run ?? null;
  }
}