import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { PayrollService } from './payroll.service';
import { PostPayrollDto } from './dto/payroll.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  /**
   * GET /payroll/template
   * Returns the country-specific deduction line labels for the wizard form.
   * All roles.
   */
  @Get('template')
  getTemplate(@Req() req: Request) {
    return this.payrollService.getTemplate(req.user!.businessId);
  }

  /**
   * GET /payroll
   * Lists all payroll journal entries for the business.
   * All roles.
   */
  @Get()
  listPayroll(@Req() req: Request) {
    return this.payrollService.listPayroll(req.user!.businessId);
  }

  /**
   * POST /payroll
   * Posts a payroll journal entry.
   * Validates that gross wages = sum(deductions) + net pay.
   * Admin only.
   */
  @Roles('admin')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  postPayroll(@Req() req: Request, @Body() dto: PostPayrollDto) {
    return this.payrollService.postPayroll(
      req.user!.businessId,
      req.user!.userId,
      dto,
    );
  }
}
