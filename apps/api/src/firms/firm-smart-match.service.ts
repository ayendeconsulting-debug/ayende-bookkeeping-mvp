import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { FirmClient, FirmClientStatus } from '../entities/firm-client.entity';
import {
  FirmSmartMatchRun,
  FirmSmartMatchRunStatus,
} from '../entities/firm-smart-match-run.entity';

@Injectable()
export class FirmSmartMatchService {
  private readonly logger = new Logger(FirmSmartMatchService.name);

  constructor(
    @InjectRepository(FirmClient)
    private readonly firmClientRepo: Repository<FirmClient>,
    @InjectRepository(FirmSmartMatchRun)
    private readonly runRepo: Repository<FirmSmartMatchRun>,
    @InjectQueue('smart-match-batch')
    private readonly batchQueue: Queue,
  ) {}

  /**
   * Enqueue a Smart Match batch job for every active client business under
   * the firm. Creates and returns a FirmSmartMatchRun tracking row.
   *
   * Individual per-client jobs run independently via SmartMatchBatchProcessor.
   * The run row is a progress-tracking artifact for the Accountant Portal UI.
   */
  async runFirmSmartMatch(
    firmId: string,
    clerkUserId: string,
  ): Promise<FirmSmartMatchRun> {
    const clients = await this.firmClientRepo.find({
      where: { firm_id: firmId, status: FirmClientStatus.ACTIVE },
      select: ['business_id'],
    });

    const clientCount = clients.length;

    // Create the run row before enqueuing — if queue fails, the row is still
    // created so the accountant knows the trigger was attempted.
    const run = await this.runRepo.save(
      this.runRepo.create({
        firm_id: firmId,
        initiated_by_user_id: clerkUserId,
        client_count: clientCount,
        clients_complete: 0,
        status: FirmSmartMatchRunStatus.RUNNING,
        completed_at: null,
      }),
    );

    if (clientCount === 0) {
      await this.runRepo.update(run.id, {
        status: FirmSmartMatchRunStatus.COMPLETE,
        completed_at: new Date(),
      });
      return { ...run, status: FirmSmartMatchRunStatus.COMPLETE, client_count: 0 };
    }

    // Enqueue one job per active client business
    let queued = 0;
    for (const client of clients) {
      try {
        await this.batchQueue.add(
          'smart-match-batch',
          { businessId: client.business_id },
          { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
        );
        queued++;
      } catch (err) {
        this.logger.warn(
          `Firm ${firmId}: failed to enqueue Smart Match for business ${client.business_id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    this.logger.log(
      `Firm Smart Match run ${run.id}: ${queued}/${clientCount} jobs enqueued`,
    );

    return run;
  }

  /**
   * Return the most recent FirmSmartMatchRun for a firm.
   * Used by GET /firms/smart-match/status for the 3s progress poll.
   * Returns null if no run has ever been triggered.
   */
  async getLatestRun(firmId: string): Promise<FirmSmartMatchRun | null> {
    return this.runRepo.findOne({
      where: { firm_id: firmId },
      order: { started_at: 'DESC' },
    });
  }

  /**
   * Per-client completion callback — called by SmartMatchBatchProcessor
   * (future 34k.1 hook) when a client's batch job finishes.
   * Increments clients_complete and marks COMPLETE when all clients done.
   */
  async markClientComplete(runId: string): Promise<void> {
    const run = await this.runRepo.findOne({ where: { id: runId } });
    if (!run || run.status === FirmSmartMatchRunStatus.COMPLETE) return;

    const newComplete = run.clients_complete + 1;
    const isDone = newComplete >= run.client_count;

    await this.runRepo.update(runId, {
      clients_complete: newComplete,
      status: isDone ? FirmSmartMatchRunStatus.COMPLETE : FirmSmartMatchRunStatus.RUNNING,
      completed_at: isDone ? new Date() : null,
    });
  }
}