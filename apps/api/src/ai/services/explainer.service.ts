import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RawTransaction } from '../../entities/raw-transaction.entity';
import { ClassifiedTransaction } from '../../entities/classified-transaction.entity';
import { LlmService } from './llm.service';

export interface ExplainerResult {
  transaction_id: string;
  explanation: string;
  accounting_treatment: string;
  suggested_category?: string;
}

@Injectable()
export class ExplainerService {
  constructor(
    @InjectRepository(RawTransaction)
    private readonly rawTransactionRepo: Repository<RawTransaction>,
    @InjectRepository(ClassifiedTransaction)
    private readonly classifiedTransactionRepo: Repository<ClassifiedTransaction>,
    private readonly llmService: LlmService,
  ) {}

  async explain(
    businessId: string,
    rawTransactionId: string,
  ): Promise<ExplainerResult> {
    // ── Fetch raw transaction ────────────────────────────────────────────────
    const tx = await this.rawTransactionRepo.findOne({
      where: { id: rawTransactionId, business_id: businessId },
    });

    if (!tx) {
      throw new NotFoundException(
        `Transaction ${rawTransactionId} not found for this business.`,
      );
    }

    // ── Fetch classification if it exists ────────────────────────────────────
    const classified = await this.classifiedTransactionRepo.findOne({
      where: { raw_transaction_id: rawTransactionId, business_id: businessId },
      relations: ['account', 'taxCode'],
    });

    // ── Build prompt ─────────────────────────────────────────────────────────
    const classificationContext = classified
      ? `This transaction has been classified as: ${classified.account?.name ?? 'Unknown Account'} (${classified.account?.account_type ?? ''}).${classified.taxCode ? ` Tax code applied: ${classified.taxCode.name} (${classified.taxCode.rate}%).` : ''}`
      : 'This transaction has not yet been classified.';

    const systemPrompt = `You are a Canadian bookkeeping assistant helping a small business owner understand their financial transactions. Always respond in the exact JSON format requested. Use plain language — avoid accounting jargon where possible.`;

    const userPrompt = `Explain this transaction to a small business owner:

- Date: ${tx.transaction_date}
- Description: ${tx.description}
- Amount: $${Math.abs(Number(tx.amount)).toFixed(2)} ${Number(tx.amount) < 0 ? '(money out)' : '(money in)'}
- Account: ${tx.source_account_name ?? 'Unknown'}
- Source: ${tx.source}
- Classification status: ${classificationContext}

Provide:
1. A plain-language explanation of what this transaction likely represents (2-3 sentences).
2. How it should be recorded in the books (debit/credit in simple terms).
3. If unclassified, a suggested expense or income category.

Respond in this exact JSON format with no markdown or extra text:
{
  "explanation": "...",
  "accounting_treatment": "...",
  "suggested_category": "..."
}

Set suggested_category to null if the transaction is already classified.`;

    // ── Call Claude ──────────────────────────────────────────────────────────
    const raw = await this.llmService.complete(systemPrompt, userPrompt);

    // ── Parse response ───────────────────────────────────────────────────────
    let parsed: { explanation: string; accounting_treatment: string; suggested_category?: string | null };
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      // If Claude doesn't return valid JSON, wrap the raw text gracefully
      parsed = {
        explanation: raw,
        accounting_treatment: 'Please review this transaction manually.',
        suggested_category: null,
      };
    }

    return {
      transaction_id: rawTransactionId,
      explanation: parsed.explanation,
      accounting_treatment: parsed.accounting_treatment,
      ...(parsed.suggested_category ? { suggested_category: parsed.suggested_category } : {}),
    };
  }
}

