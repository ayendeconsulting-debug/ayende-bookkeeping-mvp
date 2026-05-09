import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'crypto';
import { ImportBatch, ImportStatus } from '../entities/import-batch.entity';
import {
  RawTransaction,
  RawTransactionSource,
  RawTransactionStatus,
} from '../entities/raw-transaction.entity';

interface ParsedRow {
  date: string;   // YYYY-MM-DD
  description: string;
  amount: number; // positive = expense/debit, negative = income/credit
}

@Processor('import-jobs')
export class ImportJobsProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportJobsProcessor.name);
  private readonly s3: S3Client;

  constructor(
    @InjectRepository(ImportBatch)
    private readonly batchRepo: Repository<ImportBatch>,
    @InjectRepository(RawTransaction)
    private readonly txRepo: Repository<RawTransaction>,
    // Phase 34e: producer only — enqueues smart-match-batch after successful import
    @InjectQueue('smart-match-batch')
    private readonly smartMatchQueue: Queue,
  ) {
    super();
    this.s3 = new S3Client({
      region: process.env.AWS_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  async process(job: Job): Promise<void> {
    const { batch_id, business_id, source_account_name, source_account_type, file_type } = job.data as {
      batch_id: string;
      business_id: string;
      source_account_name: string;
      source_account_type: string;
      file_type: string;
    };

    this.logger.log(`Processing import batch ${batch_id} (${file_type})`);

    await this.batchRepo.update(batch_id, {
      status: ImportStatus.PROCESSING,
      started_at: new Date(),
    });

    const batch = await this.batchRepo.findOne({ where: { id: batch_id } });
    if (!batch) throw new Error(`Batch ${batch_id} not found`);

    try {
      // Download file from S3
      const s3Res = await this.s3.send(
        new GetObjectCommand({ Bucket: batch.s3_bucket, Key: batch.s3_key }),
      );

      const chunks: Uint8Array[] = [];
      for await (const chunk of s3Res.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      // Parse rows
      let rows: ParsedRow[];
      if (file_type === 'pdf') {
        rows = await this.parsePdf(buffer);
      } else {
        rows = this.parseCsv(buffer.toString('utf-8'));
      }

      let processed = 0;
      let duplicates = 0;
      let errors = 0;

      for (const row of rows) {
        try {
          const hash = createHash('sha256')
            .update(`${business_id}:${row.date}:${row.description}:${row.amount}`)
            .digest('hex')
            .substring(0, 64);

          // Deduplication check
          const existing = await this.txRepo.findOne({
            where: { hash_signature: hash, business_id },
          });
          if (existing) {
            duplicates++;
            continue;
          }

          await this.txRepo.save(
            this.txRepo.create({
              business_id,
              import_batch_id: batch_id,
              transaction_date: new Date(row.date) as any,
              description: row.description,
              amount: row.amount,
              source_account_name,
              source_account_type,
              source: file_type === 'pdf'
                ? RawTransactionSource.PDF
                : RawTransactionSource.CSV,
              hash_signature: hash,
              status: RawTransactionStatus.PENDING,
            }),
          );
          processed++;
        } catch {
          errors++;
        }
      }

      await this.batchRepo.update(batch_id, {
        status: ImportStatus.COMPLETED,
        total_rows: rows.length,
        processed_rows: processed,
        duplicate_rows: duplicates,
        error_rows: errors,
        completed_at: new Date(),
      });

      this.logger.log(
        `Batch ${batch_id} complete: ${processed} created, ${duplicates} duplicates, ${errors} errors`,
      );

      // Phase 34e: Trigger Smart Match for newly imported transactions.
      // Non-fatal — a queue failure must never fail the import job itself.
      if (processed > 0) {
        try {
          await this.smartMatchQueue.add(
            'smart-match-batch',
            { businessId: business_id, importBatchId: batch_id },
            { attempts: 3, backoff: { type: 'exponential', delay: 3000 } },
          );
          this.logger.log(`Smart Match queued for batch ${batch_id} (${processed} new tx)`);
        } catch (smErr) {
          this.logger.warn(
            `Smart Match enqueue skipped for batch ${batch_id}: ${(smErr as Error).message}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(`Batch ${batch_id} failed: ${(err as Error).message}`);
      await this.batchRepo.update(batch_id, {
        status: ImportStatus.FAILED,
        error_message: (err as Error).message,
        completed_at: new Date(),
      });
      throw err;
    }
  }

  // ── CSV Parser ────────────────────────────────────────────────────────────
  // Supports: date/description/amount, date/description/debit/credit formats.
  // Auto-detects column positions from header row.

  private parseCsv(content: string): ParsedRow[] {
    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const nonEmpty = lines.filter(l => l.trim().length > 0);
    if (nonEmpty.length < 2) return [];

    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseRow(nonEmpty[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

    const dateIdx = this.findColIdx(headers, ['date', 'transactiondate', 'posteddate', 'valuedate', 'settledate']);
    const descIdx = this.findColIdx(headers, ['description', 'merchant', 'name', 'details', 'memo', 'narrative', 'particulars']);
    const amtIdx  = this.findColIdx(headers, ['amount', 'amt', 'value', 'transactionamount']);
    const debIdx  = this.findColIdx(headers, ['debit', 'withdrawal', 'dr', 'debitamount', 'withdrawalamount']);
    const credIdx = this.findColIdx(headers, ['credit', 'deposit', 'cr', 'creditamount', 'depositamount']);

    if (dateIdx === -1 || descIdx === -1) {
      this.logger.warn('CSV header detection failed - cannot identify date or description columns');
      return [];
    }

    const rows: ParsedRow[] = [];
    for (let i = 1; i < nonEmpty.length; i++) {
      const cols = parseRow(nonEmpty[i]);
      if (cols.length < 2) continue;

      const rawDate = cols[dateIdx]?.trim();
      const rawDesc = cols[descIdx]?.trim();
      if (!rawDate || !rawDesc) continue;

      const date = this.parseDate(rawDate);
      if (!date) continue;

      let amount: number;
      if (amtIdx !== -1) {
        amount = this.parseAmount(cols[amtIdx] ?? '0');
      } else if (debIdx !== -1 || credIdx !== -1) {
        const debit  = debIdx  !== -1 ? this.parseAmount(cols[debIdx]  ?? '0') : 0;
        const credit = credIdx !== -1 ? this.parseAmount(cols[credIdx] ?? '0') : 0;
        amount = debit > 0 ? debit : -Math.abs(credit);
      } else {
        continue;
      }

      rows.push({ date, description: rawDesc, amount });
    }
    return rows;
  }

  // ── PDF Parser ────────────────────────────────────────────────────────────

  private async parsePdf(buffer: Buffer): Promise<ParsedRow[]> {
    let pdfParse: (buf: Buffer) => Promise<{ text: string }>;
    try {
      pdfParse = require('pdf-parse');
    } catch {
      throw new Error('pdf-parse package not installed. Run: npm install pdf-parse');
    }

    const data = await pdfParse(buffer);
    const lines = data.text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);

    const rows: ParsedRow[] = [];

    const datePatterns = [
      String.raw`\d{2}[\/\-]\d{2}[\/\-]\d{4}`,
      String.raw`\d{4}[\/\-]\d{2}[\/\-]\d{2}`,
      String.raw`\d{2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}`,
      String.raw`(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}`,
    ].join('|');

    const lineRe = new RegExp(
      `^(${datePatterns})\\s+(.+?)\\s+([-$]?[\\d,]+\\.\\d{2})\\s*$`,
      'i',
    );

    for (const line of lines) {
      const m = lineRe.exec(line);
      if (!m) continue;
      const date = this.parseDate(m[1].trim());
      if (!date) continue;
      const description = m[2].trim();
      const amount = this.parseAmount(m[3]);
      rows.push({ date, description, amount });
    }

    this.logger.log(`PDF parsed: ${rows.length} transactions found from ${lines.length} lines`);
    return rows;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private findColIdx(headers: string[], candidates: string[]): number {
    for (const c of candidates) {
      const idx = headers.findIndex(h => h.includes(c));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  private parseDate(raw: string): string | null {
    const cleaned = raw.replace(/[^\w\s\/\-,]/g, '').trim();

    const slashMatch = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/.exec(cleaned);
    if (slashMatch) {
      const [, a, b, year] = slashMatch;
      const month = parseInt(a, 10);
      const day   = parseInt(b, 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
      }
    }

    const isoMatch = /^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/.exec(cleaned);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }

    return null;
  }

  private parseAmount(raw: string): number {
    const cleaned = raw.replace(/[$,\s]/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
}