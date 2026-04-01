import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmService, LlmMessage } from './llm.service';
import { JournalLine } from '../../entities/journal-line.entity';
import { AiChatDto, ChatMessageDto } from '../dto/ai.dto';

export interface ChatResponse {
  reply: string;
  messages: ChatMessageDto[];
}

@Injectable()
export class ChatService {
  constructor(
    private readonly llmService: LlmService,
    @InjectRepository(JournalLine)
    private readonly journalLineRepo: Repository<JournalLine>,
  ) {}

  async chat(dto: AiChatDto): Promise<ChatResponse> {
    const { businessId, messages, startDate, endDate } = dto;

    // Build a financial summary to give the AI relevant context
    const financialContext = await this.buildFinancialContext(businessId, startDate, endDate);

    const systemPrompt = `You are a knowledgeable and friendly bookkeeping assistant for a Canadian/US small business.
You have access to the business's financial data summarised below. Answer questions about their finances accurately and concisely.
If you cannot answer from the data provided, say so clearly rather than guessing.
Do not make up numbers. Always reference the data provided.

${financialContext}`;

    // Convert to LlmMessage format
    const llmMessages: LlmMessage[] = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const reply = await this.llmService.completeWithHistory(systemPrompt, llmMessages);

    // Return the updated conversation with the assistant's reply appended
    return {
      reply,
      messages: [
        ...messages,
        { role: 'assistant', content: reply },
      ],
    };
  }

  private async buildFinancialContext(
    businessId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<string> {
    const start = startDate ?? new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const end = endDate ?? new Date().toISOString().split('T')[0];

    // Revenue/expense summary by account
    const rows = await this.journalLineRepo
      .createQueryBuilder('jl')
      .select('a.name', 'account_name')
      .addSelect('a.account_type', 'account_type')
      .addSelect('SUM(jl.debit_amount)', 'total_debits')
      .addSelect('SUM(jl.credit_amount)', 'total_credits')
      .innerJoin('jl.journalEntry', 'je')
      .innerJoin('jl.account', 'a')
      .where('jl.business_id = :businessId', { businessId })
      .andWhere("je.status = 'posted'")
      .andWhere('je.entry_date >= :start', { start })
      .andWhere('je.entry_date <= :end', { end })
      .groupBy('a.name')
      .addGroupBy('a.account_type')
      .orderBy('a.account_type', 'ASC')
      .getRawMany();

    if (rows.length === 0) {
      return `Financial context: No posted transactions found for the period ${start} to ${end}.`;
    }

    const lines = rows.map(r => {
      const debits = parseFloat(r.total_debits) || 0;
      const credits = parseFloat(r.total_credits) || 0;
      return `  ${r.account_type.toUpperCase()} | ${r.account_name} | Debits: $${debits.toFixed(2)} | Credits: $${credits.toFixed(2)}`;
    }).join('\n');

    return `FINANCIAL SUMMARY for period ${start} to ${end}:\n${lines}`;
  }
}
