import {
  Controller, Get, Post, Patch, Delete, Body, Param, Req, Query,
} from '@nestjs/common';
import { Request } from 'express';
import { PersonalService } from './personal.service';
import {
  CreateBudgetCategoryDto, UpdateBudgetCategoryDto,
  CreateSavingsGoalDto, UpdateSavingsGoalDto,
  ConfirmDetectionDto, DismissDetectionDto,
  SnoozeReminderDto, DismissReminderDto,
  AssignPersonalCategoryDto,
} from './dto/personal.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('personal')
export class PersonalController {
  constructor(private readonly personalService: PersonalService) {}

  // â”€â”€ Budget Categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('budget-categories')
  getBudgetCategories(@Req() req: Request) {
    return this.personalService.getBudgetCategories(req.user!.businessId);
  }

  @Roles('admin')
  @Post('budget-categories')
  createBudgetCategory(@Req() req: Request, @Body() dto: CreateBudgetCategoryDto) {
    return this.personalService.createBudgetCategory(req.user!.businessId, dto);
  }

  @Roles('admin')
  @Patch('budget-categories/:id')
  updateBudgetCategory(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateBudgetCategoryDto) {
    return this.personalService.updateBudgetCategory(req.user!.businessId, id, dto);
  }

  @Roles('admin')
  @Delete('budget-categories/:id')
  deleteBudgetCategory(@Req() req: Request, @Param('id') id: string) {
    return this.personalService.deleteBudgetCategory(req.user!.businessId, id);
  }

  // â”€â”€ Savings Goals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('savings-goals')
  getSavingsGoals(@Req() req: Request) {
    return this.personalService.getSavingsGoals(req.user!.businessId);
  }

  @Roles('admin')
  @Post('savings-goals')
  createSavingsGoal(@Req() req: Request, @Body() dto: CreateSavingsGoalDto) {
    return this.personalService.createSavingsGoal(req.user!.businessId, dto);
  }

  @Roles('admin')
  @Patch('savings-goals/:id')
  updateSavingsGoal(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateSavingsGoalDto) {
    return this.personalService.updateSavingsGoal(req.user!.businessId, id, dto);
  }

  @Roles('admin')
  @Delete('savings-goals/:id')
  deleteSavingsGoal(@Req() req: Request, @Param('id') id: string) {
    return this.personalService.deleteSavingsGoal(req.user!.businessId, id);
  }

  // â”€â”€ Net Worth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('net-worth')
  getNetWorth(@Req() req: Request) {
    return this.personalService.getNetWorth(req.user!.businessId);
  }

  // â”€â”€ Phase 17: Cashflow (Money In / Money Out from raw transactions) â”€â”€â”€â”€â”€â”€â”€

  @Get('cashflow')
  getCashflow(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const today = new Date();
    const defaultStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const defaultEnd = today.toISOString().split('T')[0];
    return this.personalService.getCashflow(
      req.user!.businessId,
      startDate ?? defaultStart,
      endDate ?? defaultEnd,
    );
  }

  // â”€â”€ Phase 17: Personal Transaction Category Assignment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Roles('admin')
  @Patch('transactions/:id/category')
  assignPersonalCategory(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: AssignPersonalCategoryDto,
  ) {
    return this.personalService.assignPersonalCategory(
      req.user!.businessId,
      id,
      dto.category_id,
    );
  }

  // â”€â”€ Recurring Detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('recurring-detections')
  detectRecurringPayments(@Req() req: Request) {
    return this.personalService.detectRecurringPayments(req.user!.businessId);
  }

  @Roles('admin')
  @Post('recurring-detections/confirm')
  confirmDetection(@Req() req: Request, @Body() dto: ConfirmDetectionDto) {
    return this.personalService.confirmDetection(req.user!.businessId, dto);
  }

  @Roles('admin')
  @Post('recurring-detections/dismiss')
  dismissDetection(@Req() req: Request, @Body() dto: DismissDetectionDto) {
    return this.personalService.dismissDetection(req.user!.businessId, dto.key);
  }

  @Get('recurring-confirmed')
  getConfirmedRecurring(@Req() req: Request) {
    return this.personalService.getConfirmedRecurring(req.user!.businessId);
  }

  // â”€â”€ Upcoming Reminders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Get('upcoming-reminders')
  getUpcomingReminders(@Req() req: Request) {
    return this.personalService.getUpcomingReminders(req.user!.businessId);
  }

  @Roles('admin')
  @Post('upcoming-reminders/snooze')
  snoozeReminder(@Req() req: Request, @Body() dto: SnoozeReminderDto) {
    return this.personalService.snoozeReminder(
      req.user!.businessId, dto.key, dto.due_date, dto.snoozed_until,
    );
  }

  @Roles('admin')
  @Post('upcoming-reminders/dismiss')
  dismissReminder(@Req() req: Request, @Body() dto: DismissReminderDto) {
    return this.personalService.dismissReminder(
      req.user!.businessId, dto.key, dto.due_date,
    );
  }
}
