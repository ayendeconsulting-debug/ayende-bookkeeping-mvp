import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import { HstReportService } from './services/hst-report.service';
import { HstExportService } from './services/hst-export.service';
import { Business } from '../entities/business.entity';

export const PDF_JOBS_QUEUE = 'pdf-jobs';

export interface PdfJobData {
  type: 'hst-pdf';
  businessId: string;
  periodId: string;
  instalmentsPaid: number;
}

export interface PdfJobResult {
  download_path: string;
  filename: string;
}

@Processor(PDF_JOBS_QUEUE)
export class PdfJobsProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfJobsProcessor.name);

  constructor(
    private readonly hstReportService: HstReportService,
    private readonly hstExportService: HstExportService,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
  ) {
    super();
  }

  async process(job: Job<PdfJobData>): Promise<PdfJobResult> {
    const { businessId, periodId, instalmentsPaid } = job.data;
    this.logger.log(`Processing PDF job ${job.id} for business ${businessId}`);

    const [report, business] = await Promise.all([
      this.hstReportService.getCraReport(businessId, periodId, instalmentsPaid),
      this.businessRepo.findOne({ where: { id: businessId } }),
    ]);

    const pdfBuffer = await this.hstExportService.generatePdf(
      report,
      business?.name ?? 'Unknown Business',
      business?.hst_registration_number ?? null,
    );

    // Write to /tmp — accessible within the same Railway container
    const filename = `hst-report-${report.period.period_start}-to-${report.period.period_end}.pdf`;
    const filePath = path.join('/tmp', `tempo-pdf-${job.id}.pdf`);
    fs.writeFileSync(filePath, pdfBuffer);

    this.logger.log(`PDF job ${job.id} complete — written to ${filePath}`);
    return { download_path: filePath, filename };
  }
}
