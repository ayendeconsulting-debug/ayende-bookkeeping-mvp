import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { ReceiptExportService } from '../services/receipt-export.service';
import { ReceiptExportSubmitDto } from '../dto/receipt-export.dto';

/**
 * Phase 31b.6 - HTTP surface for the Bulk Receipt Export feature.
 *
 * Endpoints:
 *   POST   /reports/receipt-export/preflight       - count receipts + AI cap impact
 *   POST   /reports/receipt-export/submit          - enqueue export job
 *   GET    /reports/receipt-export/status/:jobId   - poll job state + counts
 *   GET    /reports/receipt-export/download/:jobId - issue presigned S3 URL
 *
 * Auth: protected by global JwtAuthGuard. req.user.businessId scopes every call.
 *
 * Out of scope: list/history endpoint (deferred to 31d), cancel endpoint
 * (deferred), email dispatch (31b.5).
 */
@Controller('reports/receipt-export')
export class ReceiptExportController {
  constructor(private readonly service: ReceiptExportService) {}

  /**
   * Preflight: count receipts in range and compute AI cap impact. Idempotent,
   * no DB writes. UI calls this on date-range change to surface partial-export
   * warnings before the user clicks "Export".
   *
   * Reuses ReceiptExportSubmitDto for date validation. acknowledge_partial is
   * ignored on this endpoint (it only matters at submit time).
   */
  @Post('preflight')
  preflight(@Req() req: Request, @Body() dto: ReceiptExportSubmitDto) {
    return this.service.preflight(
      req.user!.businessId,
      dto.startDate,
      dto.endDate,
    );
  }

  /**
   * Submit: validate, create receipt_export_jobs row, enqueue BullMQ job.
   * Returns job_id for status polling.
   *
   * Errors (mapped from service):
   *   400 - invalid date range / 24-month overrun / >500 receipts
   *   409 - AI cap exceeded without acknowledge_partial=true
   *   429 - another export already queued or running for this business
   */
  @Post('submit')
  submit(@Req() req: Request, @Body() dto: ReceiptExportSubmitDto) {
    // TODO 31b.5: user_email is intentionally null here pending an email-source
    // decision. Three candidates (in order of preference):
    //   1. JWT enrichment - add 'email' claim to Clerk JWT template, expose
    //      via JwtStrategy.validate() and ClerkUser interface.
    //   2. Clerk SDK lookup - clerkClient.users.getUser(userId) at submit time.
    //   3. Subscription.customer_email fallback - reuse trial-monitor pattern.
    // Whichever 31b.5 chooses, just replace this null literal with the value.
    const userEmail: string | null = null;

    return this.service.submit(
      req.user!.businessId,
      req.user!.userId,
      userEmail,
      dto,
    );
  }

  /**
   * Status: poll a job's progress. Returns whitelisted shape (excludes
   * download_key + user_email per FR-31-6-10).
   *
   * 404 if jobId not owned by the authed business.
   */
  @Get('status/:jobId')
  getStatus(
    @Req() req: Request,
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
  ) {
    return this.service.getStatus(req.user!.businessId, jobId);
  }

  /**
   * Download: issue a 15-minute presigned S3 URL for the assembled zip.
   * Frontend redirects the browser to this URL.
   *
   * Errors:
   *   404 - jobId not owned by business
   *   409 - job not yet COMPLETE (still queued/running, or failed)
   *   410 - job past 7-day retention window OR download_key missing
   */
  @Get('download/:jobId')
  getDownload(
    @Req() req: Request,
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
  ) {
    return this.service.getDownloadUrl(req.user!.businessId, jobId);
  }
}
