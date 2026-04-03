import {
  Controller,
  Get,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request } from 'express';
import { Response } from 'express';
import { IncomeStatementService } from '../services/income-statement.service';
import { BalanceSheetService } from '../services/balance-sheet.service';
import { TrialBalanceService } from '../services/trial-balance.service';
import { GeneralLedgerService } from '../services/general-ledger.service';
import { ExportService } from '../services/export.service';
import { SparklineService } from '../services/sparkline.service';
import { ReportFilterDto, ExportFormat } from '../dto/report-filter.dto';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly incomeStatementService: IncomeStatementService,
    private readonly balanceSheetService: BalanceSheetService,
    private readonly trialBalanceService: TrialBalanceService,
    private readonly generalLedgerService: GeneralLedgerService,
    private readonly exportService: ExportService,
    private readonly sparklineService: SparklineService,
  ) {}

  // ── Sparkline ────────────────────────────────────────────────────────────

  /** GET /reports/sparkline — 30-day daily trend data for dashboard metric cards */
  @Get('sparkline')
  getSparklineData(@Req() req: Request) {
    return this.sparklineService.getSparklineData(req.user!.businessId);
  }

  // ── Report Endpoints ──────────────────────────────────────────────────────

  @Get('income-statement')
  incomeStatement(@Req() req: Request, @Query() filter: ReportFilterDto) {
    filter.businessId = req.user!.businessId;
    return this.incomeStatementService.generate(filter);
  }

  @Get('balance-sheet')
  balanceSheet(@Req() req: Request, @Query() filter: ReportFilterDto) {
    filter.businessId = req.user!.businessId;
    return this.balanceSheetService.generate(filter);
  }

  @Get('trial-balance')
  trialBalance(@Req() req: Request, @Query() filter: ReportFilterDto) {
    filter.businessId = req.user!.businessId;
    return this.trialBalanceService.generate(filter);
  }

  @Get('general-ledger')
  generalLedger(@Req() req: Request, @Query() filter: ReportFilterDto) {
    filter.businessId = req.user!.businessId;
    return this.generalLedgerService.generate(filter);
  }

  // ── Export Endpoints ──────────────────────────────────────────────────────

  @Get('income-statement/export')
  async exportIncomeStatement(
    @Req() req: Request,
    @Query() filter: ReportFilterDto,
    @Query('businessName') businessName: string = 'Business',
    @Res() res: Response,
  ) {
    filter.businessId = req.user!.businessId;
    const data = await this.incomeStatementService.generate(filter);
    return this.sendExport(res, 'income-statement', data, businessName, filter.format);
  }

  @Get('balance-sheet/export')
  async exportBalanceSheet(
    @Req() req: Request,
    @Query() filter: ReportFilterDto,
    @Query('businessName') businessName: string = 'Business',
    @Res() res: Response,
  ) {
    filter.businessId = req.user!.businessId;
    const data = await this.balanceSheetService.generate(filter);
    return this.sendExport(res, 'balance-sheet', data, businessName, filter.format);
  }

  @Get('trial-balance/export')
  async exportTrialBalance(
    @Req() req: Request,
    @Query() filter: ReportFilterDto,
    @Query('businessName') businessName: string = 'Business',
    @Res() res: Response,
  ) {
    filter.businessId = req.user!.businessId;
    const data = await this.trialBalanceService.generate(filter);
    return this.sendExport(res, 'trial-balance', data, businessName, filter.format);
  }

  @Get('general-ledger/export')
  async exportGeneralLedger(
    @Req() req: Request,
    @Query() filter: ReportFilterDto,
    @Query('businessName') businessName: string = 'Business',
    @Res() res: Response,
  ) {
    filter.businessId = req.user!.businessId;
    const data = await this.generalLedgerService.generate(filter);
    return this.sendExport(res, 'general-ledger', data, businessName, filter.format);
  }

  // ── Helper ────────────────────────────────────────────────────────────────

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
