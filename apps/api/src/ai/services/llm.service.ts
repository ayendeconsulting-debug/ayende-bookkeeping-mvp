import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly provider: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.model = this.configService.get<string>('AI_MODEL', 'claude-sonnet-4-6');
    this.provider = this.configService.get<string>('AI_PROVIDER', 'anthropic');
  }

  /**
   * Single completion call — all AI services call only this method.
   * Swap models by changing AI_MODEL in .env — zero code changes needed.
   */
  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    return this.completeWithHistory(systemPrompt, [{ role: 'user', content: userPrompt }]);
  }

  /**
   * Multi-turn completion — used by the chat service.
   */
  async completeWithHistory(systemPrompt: string, messages: LlmMessage[]): Promise<string> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('ANTHROPIC_API_KEY is not configured');
    }

    if (this.provider === 'anthropic') {
      return this.callAnthropic(systemPrompt, messages);
    }

    throw new InternalServerErrorException(`Unsupported AI_PROVIDER: ${this.provider}`);
  }

  private async callAnthropic(systemPrompt: string, messages: LlmMessage[]): Promise<string> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Anthropic API error ${response.status}: ${error}`);
        throw new InternalServerErrorException(`AI service error: ${response.status}`);
      }

      const data = await response.json() as {
        content: Array<{ type: string; text: string }>;
      };

      const textBlock = data.content.find((b) => b.type === 'text');
      if (!textBlock) {
        throw new InternalServerErrorException('No text content in AI response');
      }

      return textBlock.text;
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err;
      this.logger.error('LlmService.callAnthropic failed', err);
      throw new InternalServerErrorException('Failed to reach AI service');
    }
  }
}
