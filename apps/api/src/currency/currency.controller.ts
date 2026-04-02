import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { IsNumber, IsPositive } from 'class-validator';
import { CurrencyService } from './currency.service';
import { Roles } from '../auth/roles.decorator';

class OverrideRateDto {
  @IsNumber()
  @IsPositive()
  rate: number;
}

@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  /**
   * GET /currency/rates?base=CAD
   * Returns cached exchange rates for the given base currency.
   * Defaults to business base currency if ?base not provided.
   * All roles.
   */
  @Get('rates')
  async getRates(
    @Req() req: Request,
    @Query('base') base?: string,
  ) {
    // Base defaults to CAD if not specified — business currency determined at service layer
    const baseCurrency = base ?? 'CAD';
    const rates = await this.currencyService.getRates(baseCurrency);
    return {
      base: baseCurrency,
      rates,
      supported_currencies: this.currencyService.getSupportedCurrencies(),
    };
  }

  /**
   * GET /currency/convert?amount=100&from=USD&to=CAD
   * Converts an amount between two currencies using cached rates.
   * All roles.
   */
  @Get('convert')
  async convert(
    @Query('amount') amount: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
      return { error: 'Invalid amount' };
    }
    const converted = await this.currencyService.convert(amountNum, from, to);
    return { amount: amountNum, from, to, converted };
  }

  /**
   * PATCH /currency/transactions/:id/rate
   * Manually override the exchange rate for a specific transaction.
   * Use when the auto-fetched rate is incorrect.
   * Admin only.
   */
  @Roles('admin')
  @Patch('transactions/:id/rate')
  async overrideRate(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: OverrideRateDto,
  ) {
    return this.currencyService.overrideTransactionRate(
      req.user!.businessId,
      id,
      dto.rate,
    );
  }
}
