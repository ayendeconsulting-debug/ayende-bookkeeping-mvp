import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { InvoiceService } from './invoice.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  RecordPaymentDto,
} from './dto/invoice.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  /** POST /invoices — admin only */
  @Roles('admin')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: Request, @Body() dto: CreateInvoiceDto) {
    return this.invoiceService.create(req.user!.businessId, req.user!.userId, dto);
  }

  /** GET /invoices — all roles */
  @Get()
  findAll(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.invoiceService.findAll(req.user!.businessId, {
      status,
      search,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  /** GET /invoices/:id — all roles */
  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.invoiceService.findOne(req.user!.businessId, id);
  }

  /** PATCH /invoices/:id — admin only (draft only) */
  @Roles('admin')
  @Patch(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoiceService.update(req.user!.businessId, id, dto);
  }

  /** POST /invoices/:id/send — admin only */
  @Roles('admin')
  @Post(':id/send')
  markAsSent(@Req() req: Request, @Param('id') id: string) {
    return this.invoiceService.markAsSent(req.user!.businessId, id);
  }

  /** POST /invoices/:id/pay — admin only */
  @Roles('admin')
  @Post(':id/pay')
  recordPayment(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.invoiceService.recordPayment(
      req.user!.businessId,
      id,
      dto,
      req.user!.userId,
    );
  }

  /** POST /invoices/:id/void — admin only */
  @Roles('admin')
  @Post(':id/void')
  voidInvoice(@Req() req: Request, @Param('id') id: string) {
    return this.invoiceService.voidInvoice(req.user!.businessId, id);
  }

  /** GET /invoices/:id/pdf — all roles */
  @Get(':id/pdf')
  async getPdf(
    @Req() req: Request,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.invoiceService.generatePdf(req.user!.businessId, id);
    const invoice = await this.invoiceService.findOne(req.user!.businessId, id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }
}
