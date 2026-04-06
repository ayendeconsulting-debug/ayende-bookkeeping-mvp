import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ClassificationAiService } from './services/classification-ai.service';
import { AnomalyService } from './services/anomaly.service';
import { ExplainerService } from './services/explainer.service';
import { YearEndService } from './services/year-end.service';

export const AI_JOBS_QUEUE = 'ai-jobs';

export type AiJobType = 'classify' | 'anomalies' | 'explain' | 'year_end';

export interface ClassifyJobData {
  type: 'classify';
  businessId: string;
  rawTransactionId: string;
}

export interface AnomaliesJobData {
  type: 'anomalies';
  businessId: string;
  startDate: string;
  endDate: string;
}

export interface ExplainJobData {
  type: 'explain';
  businessId: string;
  rawTransactionId: string;
}

export interface YearEndJobData {
  type: 'year_end';
  businessId: string;
  fiscalYearEnd: string;
}

export type AiJobData =
  | ClassifyJobData
  | AnomaliesJobData
  | ExplainJobData
  | YearEndJobData;

@Processor(AI_JOBS_QUEUE)
export class AiJobsProcessor extends WorkerHost {
  private readonly logger = new Logger(AiJobsProcessor.name);

  constructor(
    private readonly classificationAiService: ClassificationAiService,
    private readonly anomalyService: AnomalyService,
    private readonly explainerService: ExplainerService,
    private readonly yearEndService: YearEndService,
  ) {
    super();
  }

  async process(job: Job<AiJobData>): Promise<any> {
    this.logger.log(`Processing AI job ${job.id} type=${job.data.type}`);

    switch (job.data.type) {
      case 'classify': {
        const { businessId, rawTransactionId } = job.data;
        const result = await this.classificationAiService.suggest(
          businessId,
          rawTransactionId,
        );
        this.logger.log(`AI classify job ${job.id} complete`);
        return result;
      }

      case 'anomalies': {
        const { businessId, startDate, endDate } = job.data;
        const result = await this.anomalyService.detect(
          businessId,
          startDate,
          endDate,
        );
        this.logger.log(`AI anomalies job ${job.id} complete`);
        return result;
      }

      case 'explain': {
        const { businessId, rawTransactionId } = job.data;
        const result = await this.explainerService.explain(
          businessId,
          rawTransactionId,
        );
        this.logger.log(`AI explain job ${job.id} complete`);
        return result;
      }

      case 'year_end': {
        const { businessId, fiscalYearEnd } = job.data;
        const result = await this.yearEndService.generate(
          businessId,
          fiscalYearEnd,
        );
        this.logger.log(`AI year-end job ${job.id} complete`);
        return result;
      }

      default:
        throw new Error(`Unknown AI job type: ${(job.data as any).type}`);
    }
  }
}
