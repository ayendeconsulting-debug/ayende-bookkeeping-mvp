import {
  Controller,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { IncomeStatementService } from '../services/income-statement.service';
import { BalanceSheetService } from '../services/balance-sheet.service';
import { TrialBalanceService } from '../services/trial-balance.service';
import { GeneralLedgerService } from '../services/general-ledger.service';
import { ExportService } from '../services/export.service';
import { ReportFilterDto, ExportFormat } from '../dto/report-filter.dto';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly incomeStatementService: IncomeStatementService,
    private readonly balanceSheetService: BalanceSheetService,
    private readonly trialBalanceService: TrialBalanceService,
    private readonly generalLedgerService: GeneralLedgerService,
    private readonly exportService: ExportService,
  ) {}

  // ── Report Endpoints ───────────────────────────────────────────────

  @Get('income-statement')
  incomeStatement(@Query() filter: ReportFilterDto) {
    return this.incomeStatementService.generate(filter);
  }

  @Get('balance-sheet')
  balanceSheet(@Query() filter: ReportFilterDto) {
    return this.balanceSheetService.generate(filter);
  }

  @Get('trial-balance')
  trialBalance(@Query() filter: ReportFilterDto) {
    return this.trialBalanceService.generate(filter);
  }

  @Get('general-ledger')
  generalLedger(@Query() filter: ReportFilterDto) {
    return this.generalLedgerService.generate(filter);
  }

  // ── Export Endpoints ───────────────────────────────────────────────

  @Get('income-statement/export')
  async exportIncomeStatement(
    @Query() filter: ReportFilterDto,
    @Query('businessName') businessName: string = 'Business',
    @Res() res: Response,
  ) {
    const data = await this.incomeStatementService.generate(filter);
    return this.sendExport(res, 'income-statement', data, businessName, filter.format);
  }

  @Get('balance-sheet/export')
  async exportBalanceSheet(
    @Query() filter: ReportFilterDto,
    @Query('businessName') businessName: string = 'Business',
    @Res() res: Response,
  ) {
    const data = await this.balanceSheetService.generate(filter);
    return this.sendExport(res, 'balance-sheet', data, businessName, filter.format);
  }

  @Get('trial-balance/export')
  async exportTrialBalance(
    @Query() filter: ReportFilterDto,
    @Query('businessName') businessName: string = 'Business',
    @Res() res: Response,
  ) {
    const data = await this.trialBalanceService.generate(filter);
    return this.sendExport(res, 'trial-balance', data, businessName, filter.format);
  }

  @Get('general-ledger/export')
  async exportGeneralLedger(
    @Query() filter: ReportFilterDto,
    @Query('businessName') businessName: string = 'Business',
    @Res() res: Response,
  ) {
    const data = await this.generalLedgerService.generate(filter);
    return this.sendExport(res, 'general-ledger', data, businessName, filter.format);
  }

  // ── Helper ─────────────────────────────────────────────────────────

  private async sendExport(
    res: Response,
    reportType: string,
    data: any,
    businessName: string,
    format: ExportFormat = ExportFormat.PDF,
  ) {
    const date = new Date().toISOString().split('T')[0];
    const filename = `${reportType}-${date}`;

    if (format === ExportFormat.CSV) {
      const csv = this.exportService.generateCsv(reportType, data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    }

    const pdfBuffer = await this.exportService.generatePdf(reportType, data, businessName);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    return res.send(pdfBuffer);
  }
}
