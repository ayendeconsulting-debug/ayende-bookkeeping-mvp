import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../admin/admin.guard';
import {
  EmailTemplatesService,
  CreateTemplateDto,
  UpdateTemplateDto,
} from './email-templates.service';

@Controller('admin/templates')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class EmailTemplatesController {
  constructor(private readonly service: EmailTemplatesService) {}

  /** GET /admin/templates */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** POST /admin/templates */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTemplateDto) {
    return this.service.create(dto);
  }

  /** PATCH /admin/templates/:id */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.service.update(id, dto);
  }

  /** DELETE /admin/templates/:id  — soft disable */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }

  /** POST /admin/templates/:id/preview */
  @Post(':id/preview')
  @HttpCode(HttpStatus.OK)
  preview(
    @Param('id') id: string,
    @Body() body: { vars?: Record<string, string> },
  ) {
    return this.service.preview(id, body.vars ?? {});
  }

  /** POST /admin/templates/:id/delete — permanent hard delete */
  @Post(':id/delete')
  @HttpCode(HttpStatus.OK)
  hardDelete(@Param('id') id: string) {
    return this.service.hardDelete(id);
  }

  /** POST /admin/templates/:id/reactivate */
  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  reactivate(@Param('id') id: string) {
    return this.service.reactivate(id);
  }
}
