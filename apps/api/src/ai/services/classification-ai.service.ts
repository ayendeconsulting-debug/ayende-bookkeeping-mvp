import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmService } from './llm.service';
import { RawTransaction } from '../../entities/raw-transaction.entity';
import { Account } from '../../entities/account.entity';
import { TaxCode } from '../../entities/tax-code.entity';

export interface AiClassificationSuggestion {
  raw_transaction_id: string;
  description: string;
  amount: number;
  suggested_account_id: string | null;
  suggested_account_code: string | null;
  suggested_account_name: string | null;
  suggested_tax_code_id: string | null;
  suggested_tax_code: string | null;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  requires_human_review: boolean;
}

@Injectable()
export class ClassificationAiService {
  constructor(
    private readonly llmService: LlmService,
    @InjectRepository(RawTransaction)
    private readonly rawTxRepo: Repository<RawTransaction>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(TaxCode)
    private readonly taxCodeRepo: Repository<TaxCode>,
  ) {}

  async suggest(businessId: string, rawTransactionId: string): Promise<AiClassificationSuggestion> {
    const rawTx = await this.rawTxRepo.findOne({
      where: { id: rawTransactionId, business_id: businessId },
    });
    if (!rawTx) throw new NotFoundException(`Raw transaction ${rawTransactionId} not found`);

    const accounts = await this.accountRepo.find({
      where: { business_id: businessId, is_active: true },
      order: { code: 'ASC' },
    });

    const taxCodes = await this.taxCodeRepo.find({
      where: { business_id: businessId, is_active: true },
    });

    const accountList = accounts.map(a =>
      `${a.code} | ${a.name} | ${a.account_type} | ${a.account_subtype}`
    ).join('\n');

    const taxList = taxCodes.length > 0
      ? taxCodes.map(t => `${t.id} | ${t.code} | ${t.name} | ${t.tax_type} | ${(Number(t.rate) * 100).toFixed(2)}%`).join('\n')
      : 'None configured';

    const systemPrompt = `You are a bookkeeping assistant for a Canadian/US small business. 
Your job is to classify bank transactions into the correct chart of accounts.
You must respond with ONLY valid JSON and nothing else — no explanation, no markdown.`;

    const userPrompt = `Classify this transaction:
Description: "${rawTx.description}"
Amount: ${rawTx.amount}
Date: ${rawTx.transaction_date}

Available accounts (code | name | type | subtype):
${accountList}

Available tax codes (id | code | name | type | rate):
${taxList}

Respond with ONLY this JSON structure:
{
  "suggested_account_code": "<account code from the list above, or null>",
  "suggested_tax_code_id": "<tax code id from the list above, or null>",
  "confidence": "high" | "medium" | "low",
  "reasoning": "<1-2 sentence explanation>",
  "requires_human_review": true | false
}`;

    const raw = await this.llmService.complete(systemPrompt, userPrompt);

    let parsed: {
      suggested_account_code: string | null;
      suggested_tax_code_id: string | null;
      confidence: 'high' | 'medium' | 'low';
      reasoning: string;
      requires_human_review: boolean;
    };

    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return {
        raw_transaction_id: rawTransactionId,
        description: rawTx.description,
        amount: Number(rawTx.amount),
        suggested_account_id: null,
        suggested_account_code: null,
        suggested_account_name: null,
        suggested_tax_code_id: null,
        suggested_tax_code: null,
        confidence: 'low',
        reasoning: 'AI returned an unparseable response — please classify manually.',
        requires_human_review: true,
      };
    }

    const matchedAccount = accounts.find(a => a.code === parsed.suggested_account_code) ?? null;
    const matchedTaxCode = taxCodes.find(t => t.id === parsed.suggested_tax_code_id) ?? null;

    return {
      raw_transaction_id: rawTransactionId,
      description: rawTx.description,
      amount: Number(rawTx.amount),
      suggested_account_id: matchedAccount?.id ?? null,
      suggested_account_code: matchedAccount?.code ?? null,
      suggested_account_name: matchedAccount?.name ?? null,
      suggested_tax_code_id: matchedTaxCode?.id ?? null,
      suggested_tax_code: matchedTaxCode?.code ?? null,
      confidence: parsed.confidence ?? 'low',
      reasoning: parsed.reasoning ?? '',
      requires_human_review: parsed.requires_human_review ?? true,
    };
  }
}
