import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { Document, DocumentFileType } from '../entities/document.entity';
import { GetUploadUrlDto, SaveDocumentDto } from './dto/document.dto';

const UPLOAD_EXPIRY_SECONDS = 900;   // 15 minutes
const DOWNLOAD_EXPIRY_SECONDS = 900; // 15 minutes
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
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

  // ── Generate pre-signed upload URL ───────────────────────────────────────

  async getUploadUrl(
    businessId: string,
    dto: GetUploadUrlDto,
  ): Promise<{ upload_url: string; s3_key: string; s3_bucket: string }> {
    if (!this.bucket) {
      throw new BadRequestException('S3 bucket not configured. Set AWS_S3_BUCKET env var.');
    }

    if (dto.file_size_bytes > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File size exceeds 10 MB limit.');
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const sanitizedName = dto.file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `${businessId}/${year}/${month}/${randomUUID()}-${sanitizedName}`;

    const contentType = this.getContentType(dto.file_type);

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

  // ── Save document record (called after client confirms S3 upload) ─────────

  async saveDocument(
    businessId: string,
    userId: string,
    dto: SaveDocumentDto,
  ): Promise<Document> {
    if (!dto.raw_transaction_id && !dto.journal_entry_id) {
      throw new BadRequestException(
        'At least one of raw_transaction_id or journal_entry_id is required.',
      );
    }

    const fileType = this.normalizeFileType(dto.file_type);

    const doc = this.documentRepo.create({
      business_id: businessId,
      raw_transaction_id: dto.raw_transaction_id ?? null,
      journal_entry_id: dto.journal_entry_id ?? null,
      file_name: dto.file_name,
      file_type: fileType,
      file_size_bytes: dto.file_size_bytes,
      s3_key: dto.s3_key,
      s3_bucket: dto.s3_bucket,
      uploaded_by: userId,
    });

    return this.documentRepo.save(doc);
  }

  // ── List documents ────────────────────────────────────────────────────────

  async listDocuments(
    businessId: string,
    filters: { rawTransactionId?: string; journalEntryId?: string },
  ): Promise<Document[]> {
    const where: any = { business_id: businessId };

    if (filters.rawTransactionId) {
      where.raw_transaction_id = filters.rawTransactionId;
    } else if (filters.journalEntryId) {
      where.journal_entry_id = filters.journalEntryId;
    }

    return this.documentRepo.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  // ── Get pre-signed download URL ───────────────────────────────────────────

  async getDownloadUrl(businessId: string, id: string): Promise<{ url: string; expires_in: number }> {
    const doc = await this.findOne(businessId, id);

    const command = new GetObjectCommand({
      Bucket: doc.s3_bucket,
      Key: doc.s3_key,
      ResponseContentDisposition: `attachment; filename="${doc.file_name}"`,
    });

    const url = await getSignedUrl(this.s3, command, {
      expiresIn: DOWNLOAD_EXPIRY_SECONDS,
    });

    return { url, expires_in: DOWNLOAD_EXPIRY_SECONDS };
  }

  // ── Delete document ───────────────────────────────────────────────────────

  async deleteDocument(businessId: string, id: string): Promise<void> {
    const doc = await this.findOne(businessId, id);

    // Delete from S3
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: doc.s3_bucket, Key: doc.s3_key }),
      );
    } catch (err) {
      this.logger.warn(`S3 delete failed for key ${doc.s3_key}: ${err.message}`);
      // Continue to delete DB record even if S3 fails
    }

    await this.documentRepo.delete(id);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async findOne(businessId: string, id: string): Promise<Document> {
    const doc = await this.documentRepo.findOne({
      where: { id, business_id: businessId },
    });
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    return doc;
  }

  private getContentType(fileType: string): string {
    const map: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
    };
    return map[fileType.toLowerCase()] ?? 'application/octet-stream';
  }

  private normalizeFileType(fileType: string): DocumentFileType {
    const lower = fileType.toLowerCase();
    if (lower === 'jpeg') return DocumentFileType.JPG;
    if (lower === 'jpg') return DocumentFileType.JPG;
    if (lower === 'png') return DocumentFileType.PNG;
    return DocumentFileType.PDF;
  }
}
