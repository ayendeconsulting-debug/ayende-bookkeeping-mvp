import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import { HstReportService } from './services/hst-report.service';
import { HstExportService } from './services/hst-export.service';
import { YearEndExportService } from '../ai/services/year-end-export.service';
import { Business } from '../entities/business.entity';
import { YearEndReport } from '../ai/services/year-end.service';

export const PDF_JOBS_QUEUE = 'pdf-jobs';

export interface HstPdfJobData {
  type: 'hst-pdf';
  businessId: string;
  periodId: string;
  instalmentsPaid: number;
}

export interface YearEndPdfJobData {
  type: 'year-end-pdf';
  businessId: string;
  report: YearEndReport;
}

export type PdfJobData = HstPdfJobData | YearEndPdfJobData;

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
    private readonly yearEndExportService: YearEndExportService,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
  ) {
    super();
  }

  async process(job: Job<PdfJobData>): Promise<PdfJobResult> {
    this.logger.log(`Processing PDF job ${job.id} type=${job.data.type}`);

    switch (job.data.type) {
      case 'hst-pdf': {
        const { businessId, periodId, instalmentsPaid } = job.data;

        const [report, business] = await Promise.all([
          this.hstReportService.getCraReport(businessId, periodId, instalmentsPaid),
          this.businessRepo.findOne({ where: { id: businessId } }),
        ]);

        const pdfBuffer = await this.hstExportService.generatePdf(
          report,
          business?.name ?? 'Unknown Business',
          business?.hst_registration_number ?? null,
        );

        const filename = `hst-report-${report.period.period_start}-to-${report.period.period_end}.pdf`;
        const filePath = path.join('/tmp', `tempo-pdf-${job.id}.pdf`);
        fs.writeFileSync(filePath, pdfBuffer);

        this.logger.log(`HST PDF job ${job.id} complete — written to ${filePath}`);
        return { download_path: filePath, filename };
      }

      case 'year-end-pdf': {
        const { report } = job.data;

        const pdfBuffer = await this.yearEndExportService.generatePdf(report);

        const safeName = report.fiscal_year_end.replace(/[^0-9-]/g, '');
        const filename = `year-end-review-${safeName}.pdf`;
        const filePath = path.join('/tmp', `tempo-yearend-${job.id}.pdf`);
        fs.writeFileSync(filePath, pdfBuffer);

        this.logger.log(`Year-end PDF job ${job.id} complete — written to ${filePath}`);
        return { download_path: filePath, filename };
      }

      default:
        throw new Error(`Unknown PDF job type: ${(job.data as any).type}`);
    }
  }
}
