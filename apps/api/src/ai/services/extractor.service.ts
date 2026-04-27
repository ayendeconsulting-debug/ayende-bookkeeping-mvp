import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document, DocumentFileType } from '../../entities/document.entity';
import { AiUsageLog, AiFeature } from '../../entities/ai-usage-log.entity';
import { DocumentsService } from '../../documents/documents.service';
import { LlmService, VisionImage } from './llm.service';

export interface ReceiptExtractResult {
  vendor: string;
  amount: number;
  date: string;       // ISO yyyy-mm-dd
  currency: string;   // 3-letter ISO (CAD, USD)
  confidence: number; // 0.0 to 1.0
}

const MAX_VISION_BYTES = 5 * 1024 * 1024; // 5 MB Anthropic image limit

const EMPTY_RESULT: ReceiptExtractResult = {
  vendor: '',
  amount: 0,
  date: '',
  currency: '',
  confidence: 0,
};

@Injectable()
export class ExtractorService {
  private readonly logger = new Logger(ExtractorService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(AiUsageLog)
    private readonly usageRepo: Repository<AiUsageLog>,
    private readonly documentsService: DocumentsService,
    private readonly llmService: LlmService,
  ) {}

  /**
   * Phase 29c: Extracts vendor / amount / date / currency from a receipt
   * image or PDF using Claude Opus 4.7 vision.
   *
   * Failure modes return EMPTY_RESULT (confidence 0) rather than throwing,
   * so the caller (job processor) always returns a clean result payload.
   * Per FR-29-15, ai_usage_log is recorded only on confirmed Anthropic
   * success.
   */
  async extract(
    documentId: string,
    businessId: string,
    userId: string,
    jobId?: string,
  ): Promise<ReceiptExtractResult> {
    // Step 1: Load document with tenant ownership check
    const doc = await this.documentRepo.findOne({
      where: { id: documentId, business_id: businessId },
    });
    if (!doc) {
      throw new NotFoundException(
        `Document ${documentId} not found for this business.`,
      );
    }

    // Step 2: Size guard - Anthropic image content blocks max 5MB
    if (doc.file_size_bytes > MAX_VISION_BYTES) {
      this.logger.warn(
        `Receipt ${documentId} exceeds 5MB vision limit (${doc.file_size_bytes} bytes). Returning empty result.`,
      );
      return EMPTY_RESULT;
    }

    // Step 3: Fetch presigned URL, download bytes, base64-encode
    let base64: string;
    try {
      const { url } = await this.documentsService.getDownloadUrl(
        businessId,
        documentId,
      );
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.error(
          `S3 download failed for document ${documentId}: HTTP ${response.status}`,
        );
        return EMPTY_RESULT;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      base64 = buffer.toString('base64');
    } catch (err: any) {
      this.logger.error(
        `Failed to fetch document ${documentId} from S3: ${err.message}`,
      );
      return EMPTY_RESULT;
    }

    // Step 4: Build vision payload
    const mediaType = this.toMediaType(doc.file_type);
    const image: VisionImage = { mediaType, base64 };

    const systemPrompt = `You are a receipt OCR assistant for Canadian and US small businesses.
Extract structured data from the receipt image.
You must respond with ONLY valid JSON and nothing else - no preamble, no markdown fences, no explanation.`;

    const userPrompt = `Extract the following fields from this receipt:
- vendor: merchant or store name as it appears on the receipt
- amount: total amount paid (a positive decimal number, no currency symbols, no thousand separators)
- date: transaction date in yyyy-mm-dd format
- currency: 3-letter ISO code (CAD for Canadian receipts, USD for US receipts; infer from tax line - HST/GST/PST/QST means CAD, sales tax/state tax means USD)
- confidence: your confidence in the extraction from 0.0 (illegible) to 1.0 (perfectly clear)

Examples of correct output:

Canadian receipt with HST line:
{"vendor":"Tim Hortons","amount":12.43,"date":"2026-04-15","currency":"CAD","confidence":0.95}

US receipt with sales tax:
{"vendor":"Starbucks","amount":7.85,"date":"2026-04-12","currency":"USD","confidence":0.92}

Blurry or partial receipt:
{"vendor":"","amount":0,"date":"","currency":"","confidence":0.2}

Respond with ONLY the JSON object. No other text.`;

    // Step 5: Call vision LLM with one retry on failure
    let raw: string;
    try {
      raw = await this.llmService.completeVision(systemPrompt, userPrompt, image);
    } catch (err: any) {
      this.logger.warn(
        `Vision call failed for document ${documentId}, retrying once: ${err.message}`,
      );
      try {
        raw = await this.llmService.completeVision(systemPrompt, userPrompt, image);
      } catch (retryErr: any) {
        this.logger.error(
          `Vision call retry failed for document ${documentId}: ${retryErr.message}`,
        );
        return EMPTY_RESULT;
      }
    }

    // Step 6: Parse and coerce to typed result
    const result = this.parseResponse(raw);

    // Step 7: Record usage on confirmed Anthropic success (FR-29-15)
    await this.recordUsage(businessId, userId, jobId);

    return result;
  }

  private parseResponse(raw: string): ReceiptExtractResult {
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean) as {
        vendor?: unknown;
        amount?: unknown;
        date?: unknown;
        currency?: unknown;
        confidence?: unknown;
      };
      return {
        vendor: typeof parsed.vendor === 'string' ? parsed.vendor : '',
        amount:
          typeof parsed.amount === 'number' && parsed.amount >= 0
            ? parsed.amount
            : 0,
        date:
          typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
            ? parsed.date
            : '',
        currency:
          typeof parsed.currency === 'string' && /^[A-Z]{3}$/.test(parsed.currency)
            ? parsed.currency
            : '',
        confidence:
          typeof parsed.confidence === 'number' &&
          parsed.confidence >= 0 &&
          parsed.confidence <= 1
            ? parsed.confidence
            : 0,
      };
    } catch {
      this.logger.warn(`Failed to parse vision response: ${raw.slice(0, 200)}`);
      return EMPTY_RESULT;
    }
  }

  private toMediaType(fileType: DocumentFileType): VisionImage['mediaType'] {
    switch (fileType) {
      case DocumentFileType.JPG:
        return 'image/jpeg';
      case DocumentFileType.PNG:
        return 'image/png';
      case DocumentFileType.PDF:
        return 'application/pdf';
      default:
        return 'image/jpeg';
    }
  }

  private async recordUsage(
    businessId: string,
    userId: string,
    jobId: string | undefined,
  ): Promise<void> {
    try {
      await this.usageRepo.save(
        this.usageRepo.create({
          business_id: businessId,
          clerk_user_id: userId,
          feature: AiFeature.RECEIPT_EXTRACT,
          tokens_used: 0,
          job_id: jobId ?? null,
        }),
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to record AI usage for receipt extract: ${err.message}`,
      );
    }
  }
}
