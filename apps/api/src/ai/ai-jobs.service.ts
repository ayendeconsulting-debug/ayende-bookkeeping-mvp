import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AI_JOBS_QUEUE, AiJobData } from './ai-jobs.processor';

export interface JobStatusResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  result?: any;
  error?: string;
}

@Injectable()
export class AiJobsService {
  constructor(
    @InjectQueue(AI_JOBS_QUEUE)
    private readonly aiQueue: Queue<AiJobData>,
  ) {}

  // ── Enqueue ───────────────────────────────────────────────────────────────

  async enqueueClassify(
    businessId: string,
    rawTransactionId: string,
  ): Promise<{ job_id: string }> {
    const job = await this.aiQueue.add(
      'classify',
      { type: 'classify', businessId, rawTransactionId },
      { removeOnComplete: 50, removeOnFail: 20 },
    );
    return { job_id: job.id! };
  }

  async enqueueAnomalies(
    businessId: string,
    startDate: string,
    endDate: string,
  ): Promise<{ job_id: string }> {
    const job = await this.aiQueue.add(
      'anomalies',
      { type: 'anomalies', businessId, startDate, endDate },
      { removeOnComplete: 50, removeOnFail: 20 },
    );
    return { job_id: job.id! };
  }

  async enqueueExplain(
    businessId: string,
    rawTransactionId: string,
  ): Promise<{ job_id: string }> {
    const job = await this.aiQueue.add(
      'explain',
      { type: 'explain', businessId, rawTransactionId },
      { removeOnComplete: 50, removeOnFail: 20 },
    );
    return { job_id: job.id! };
  }

  async enqueueYearEnd(
    businessId: string,
    fiscalYearEnd: string,
  ): Promise<{ job_id: string }> {
    const job = await this.aiQueue.add(
      'year_end',
      { type: 'year_end', businessId, fiscalYearEnd },
      { removeOnComplete: 50, removeOnFail: 20 },
    );
    return { job_id: job.id! };
  }

  // ── Poll ──────────────────────────────────────────────────────────────────

  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    const job = await this.aiQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(
        `AI job ${jobId} not found. It may have expired or never existed.`,
      );
    }

    const state = await job.getState();

    switch (state) {
      case 'completed':
        return {
          job_id: jobId,
          status: 'complete',
          result: job.returnvalue,
        };

      case 'failed':
        return {
          job_id: jobId,
          status: 'failed',
          error: job.failedReason ?? 'AI job failed — please try again.',
        };

      case 'active':
        return { job_id: jobId, status: 'processing' };

      default:
        return { job_id: jobId, status: 'queued' };
    }
  }
}
