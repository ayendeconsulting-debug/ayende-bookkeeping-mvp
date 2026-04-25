import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ImportService } from './import.service';
import { GetImportUploadUrlDto, CreateImportBatchDto } from './dto/create-batch.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /**
   * POST /import/upload-url
   * Returns a pre-signed S3 PUT URL for direct browser upload.
   * Admin only.
   */
  @Roles('admin')
  @Post('upload-url')
  getUploadUrl(@Req() req: Request, @Body() dto: GetImportUploadUrlDto) {
    return this.importService.getUploadUrl(req.user!.businessId, dto);
  }

  /**
   * POST /import/batches
   * Creates an import batch record and queues the parse job.
   * Called after the client has confirmed the S3 upload.
   * Admin only.
   */
  @Roles('admin')
  @Post('batches')
  createBatch(@Req() req: Request, @Body() dto: CreateImportBatchDto) {
    return this.importService.createBatch(
      req.user!.businessId,
      req.user!.userId,
      dto,
    );
  }

  /**
   * GET /import/batches/:id
   * Poll batch status. All roles.
   */
  @Get('batches/:id')
  getBatch(@Req() req: Request, @Param('id') id: string) {
    return this.importService.getBatch(req.user!.businessId, id);
  }

  /**
   * GET /import/batches
   * List all import batches for the business (paginated). All roles.
   */
  @Get('batches')
  listBatches(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.importService.listBatches(
      req.user!.businessId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }
}
