import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { ImportBatch, ImportStatus } from '../entities/import-batch.entity';
import { Account } from '../entities/account.entity';
import { GetImportUploadUrlDto, CreateImportBatchDto } from './dto/create-batch.dto';

const UPLOAD_EXPIRY_SECONDS = 900;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    @InjectRepository(ImportBatch)
    private readonly batchRepo: Repository<ImportBatch>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectQueue('import-jobs')
    private readonly importQueue: Queue,
  ) {
    this.bucket = process.env.AWS_S3_BUCKET ?? '';
    this.s3 = new S3Client({
      region: process.env.AWS_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  // ── Generate pre-signed S3 upload URL ─────────────────────────────────────

  async getUploadUrl(businessId: string, dto: GetImportUploadUrlDto) {
    if (!this.bucket) {
      throw new BadRequestException('S3 not configured. Set AWS_S3_BUCKET env var.');
    }
    if (dto.file_size_bytes > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File exceeds 10 MB limit.');
    }

    const sanitized = dto.file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const now = new Date();
    const s3Key = `${businessId}/imports/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${randomUUID()}-${sanitized}`;
    const contentType = dto.file_type === 'pdf' ? 'application/pdf' : 'text/csv';

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: contentType,
      ContentLength: dto.file_size_bytes,
    });

    const upload_url = await getSignedUrl(this.s3, command, {
      expiresIn: UPLOAD_EXPIRY_SECONDS,
    });

    return { upload_url, s3_key: s3Key, s3_bucket: this.bucket };
  }

  // ── Create batch + queue parse job ────────────────────────────────────────

  async createBatch(businessId: string, userId: string, dto: CreateImportBatchDto) {
    const account = await this.accountRepo.findOne({
      where: { id: dto.source_account_id, business_id: businessId },
    });
    if (!account) throw new NotFoundException('Source account not found.');

    const batch = this.batchRepo.create({
      business_id: businessId,
      file_name: dto.file_name,
      file_type: dto.file_type,
      file_size: dto.file_size,
      s3_key: dto.s3_key,
      s3_bucket: dto.s3_bucket,
      uploaded_by: userId,
      status: ImportStatus.PENDING,
    });
    const saved = await this.batchRepo.save(batch);

    await this.importQueue.add('parse-file', {
      batch_id: saved.id,
      business_id: businessId,
      source_account_name: (account as any).name,
      source_account_type: (account as any).account_type,
      file_type: dto.file_type,
    });

    this.logger.log(`Import batch ${saved.id} created — queued parse-file job`);
    return saved;
  }

  // ── Get single batch ───────────────────────────────────────────────────────

  async getBatch(businessId: string, id: string) {
    const batch = await this.batchRepo.findOne({
      where: { id, business_id: businessId },
    });
    if (!batch) throw new NotFoundException('Batch not found.');
    return batch;
  }

  // ── List batches (paginated) ───────────────────────────────────────────────

  async listBatches(businessId: string, page = 1, limit = 10) {
    const [data, total] = await this.batchRepo.findAndCount({
      where: { business_id: businessId },
      order: { created_at: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return { data, total, page, limit };
  }
}
