import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { RecurringService } from './recurring.service';
import { CreateRecurringDto, UpdateRecurringDto } from './dto/recurring.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('recurring')
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  /** POST /recurring — admin only */
  @Roles('admin')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: Request, @Body() dto: CreateRecurringDto) {
    return this.recurringService.create(req.user!.businessId, dto);
  }

  /** GET /recurring — all roles */
  @Get()
  findAll(@Req() req: Request) {
    return this.recurringService.findAll(req.user!.businessId);
  }

  /** GET /recurring/:id — all roles */
  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.recurringService.findOne(req.user!.businessId, id);
  }

  /** PATCH /recurring/:id — admin only */
  @Roles('admin')
  @Patch(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringDto,
  ) {
    return this.recurringService.update(req.user!.businessId, id, dto);
  }

  /** POST /recurring/:id/pause — admin only */
  @Roles('admin')
  @Post(':id/pause')
  pause(@Req() req: Request, @Param('id') id: string) {
    return this.recurringService.pause(req.user!.businessId, id);
  }

  /** POST /recurring/:id/resume — admin only */
  @Roles('admin')
  @Post(':id/resume')
  resume(@Req() req: Request, @Param('id') id: string) {
    return this.recurringService.resume(req.user!.businessId, id);
  }

  /** DELETE /recurring/:id (cancel) — admin only */
  @Roles('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  cancel(@Req() req: Request, @Param('id') id: string) {
    return this.recurringService.cancel(req.user!.businessId, id);
  }
}
