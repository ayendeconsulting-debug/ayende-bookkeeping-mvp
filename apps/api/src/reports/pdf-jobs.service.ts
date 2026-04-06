import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PDF_JOBS_QUEUE, PdfJobData, PdfJobResult } from './pdf-jobs.processor';
import { YearEndReport } from '../ai/services/year-end.service';

export interface PdfJobStatusResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  download_url?: string;
  filename?: string;
  error?: string;
}

@Injectable()
export class PdfJobsService {
  constructor(
    @InjectQueue(PDF_JOBS_QUEUE)
    private readonly pdfQueue: Queue<PdfJobData>,
  ) {}

  // ── HST PDF ───────────────────────────────────────────────────────────────

  async enqueuePdfExport(
    businessId: string,
    periodId: string,
    instalmentsPaid: number,
  ): Promise<{ job_id: string }> {
    const job = await this.pdfQueue.add(
      'hst-pdf',
      { type: 'hst-pdf', businessId, periodId, instalmentsPaid },
      { removeOnComplete: 20, removeOnFail: 10 },
    );
    return { job_id: job.id! };
  }

  // ── Year-End PDF ──────────────────────────────────────────────────────────

  async enqueueYearEndPdf(
    businessId: string,
    report: YearEndReport,
  ): Promise<{ job_id: string }> {
    const job = await this.pdfQueue.add(
      'year-end-pdf',
      { type: 'year-end-pdf', businessId, report },
      { removeOnComplete: 20, removeOnFail: 10 },
    );
    return { job_id: job.id! };
  }

  // ── Poll ──────────────────────────────────────────────────────────────────

  async getPdfJobStatus(
    jobId: string,
    downloadBaseUrl: string = '/tax/hst/report/download',
  ): Promise<PdfJobStatusResponse> {
    const job = await this.pdfQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(
        `PDF job ${jobId} not found. It may have expired or never existed.`,
      );
    }

    const state = await job.getState();

    switch (state) {
      case 'completed': {
        const result = job.returnvalue as PdfJobResult;
        // Determine download URL by job type
        const isYearEnd = (job.data as PdfJobData).type === 'year-end-pdf';
        const downloadUrl = isYearEnd
          ? `/ai/year-end/download/${jobId}`
          : `/tax/hst/report/download/${jobId}`;
        return {
          job_id: jobId,
          status: 'complete',
          download_url: downloadUrl,
          filename: result.filename,
        };
      }
      case 'failed':
        return {
          job_id: jobId,
          status: 'failed',
          error: job.failedReason ?? 'PDF generation failed — please try again.',
        };
      case 'active':
        return { job_id: jobId, status: 'processing' };
      default:
        return { job_id: jobId, status: 'queued' };
    }
  }

  async getPdfPath(jobId: string): Promise<{ filePath: string; filename: string } | null> {
    const job = await this.pdfQueue.getJob(jobId);
    if (!job) return null;
    const state = await job.getState();
    if (state !== 'completed') return null;
    const result = job.returnvalue as PdfJobResult;
    return { filePath: result.download_path, filename: result.filename };
  }
}
