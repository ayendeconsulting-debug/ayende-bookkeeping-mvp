import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../admin/admin.guard';
import {
  AutomationsService,
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
} from './automations.service';

@Controller('admin/automations')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminAutomationsController {
  constructor(private readonly service: AutomationsService) {}

  /** GET /admin/automations */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** POST /admin/automations */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateAutomationRuleDto) {
    return this.service.create(dto);
  }

  /** PATCH /admin/automations/:id */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAutomationRuleDto) {
    return this.service.update(id, dto);
  }

  /** POST /admin/automations/:id/toggle — flip is_active */
  @Post(':id/toggle')
  @HttpCode(HttpStatus.OK)
  toggle(@Param('id') id: string) {
    return this.service.toggle(id);
  }

  /** DELETE /admin/automations/:id */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
