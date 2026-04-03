import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PersonalService } from './personal.service';
import {
  CreateBudgetCategoryDto,
  UpdateBudgetCategoryDto,
  CreateSavingsGoalDto,
  UpdateSavingsGoalDto,
} from './dto/personal.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('personal')
export class PersonalController {
  constructor(private readonly personalService: PersonalService) {}

  // ── Budget Categories ─────────────────────────────────────────────

  /** GET /personal/budget-categories — all roles */
  @Get('budget-categories')
  getBudgetCategories(@Req() req: Request) {
    return this.personalService.getBudgetCategories(req.user!.businessId);
  }

  /** POST /personal/budget-categories — admin only */
  @Roles('admin')
  @Post('budget-categories')
  createBudgetCategory(@Req() req: Request, @Body() dto: CreateBudgetCategoryDto) {
    return this.personalService.createBudgetCategory(req.user!.businessId, dto);
  }

  /** PATCH /personal/budget-categories/:id — admin only */
  @Roles('admin')
  @Patch('budget-categories/:id')
  updateBudgetCategory(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetCategoryDto,
  ) {
    return this.personalService.updateBudgetCategory(req.user!.businessId, id, dto);
  }

  /** DELETE /personal/budget-categories/:id — admin only */
  @Roles('admin')
  @Delete('budget-categories/:id')
  deleteBudgetCategory(@Req() req: Request, @Param('id') id: string) {
    return this.personalService.deleteBudgetCategory(req.user!.businessId, id);
  }

  // ── Savings Goals ─────────────────────────────────────────────────

  /** GET /personal/savings-goals — all roles */
  @Get('savings-goals')
  getSavingsGoals(@Req() req: Request) {
    return this.personalService.getSavingsGoals(req.user!.businessId);
  }

  /** POST /personal/savings-goals — admin only */
  @Roles('admin')
  @Post('savings-goals')
  createSavingsGoal(@Req() req: Request, @Body() dto: CreateSavingsGoalDto) {
    return this.personalService.createSavingsGoal(req.user!.businessId, dto);
  }

  /** PATCH /personal/savings-goals/:id — admin only */
  @Roles('admin')
  @Patch('savings-goals/:id')
  updateSavingsGoal(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateSavingsGoalDto,
  ) {
    return this.personalService.updateSavingsGoal(req.user!.businessId, id, dto);
  }

  /** DELETE /personal/savings-goals/:id — admin only */
  @Roles('admin')
  @Delete('savings-goals/:id')
  deleteSavingsGoal(@Req() req: Request, @Param('id') id: string) {
    return this.personalService.deleteSavingsGoal(req.user!.businessId, id);
  }

  // ── Net Worth ─────────────────────────────────────────────────────

  /** GET /personal/net-worth — all roles */
  @Get('net-worth')
  getNetWorth(@Req() req: Request) {
    return this.personalService.getNetWorth(req.user!.businessId);
  }
}
