import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { DocumentsService } from './documents.service';
import { GetUploadUrlDto, SaveDocumentDto } from './dto/document.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * POST /documents/upload
   * Returns a pre-signed S3 URL for direct client-to-S3 upload.
   * Client uploads directly to S3 — no file data passes through the API.
   * Admin only.
   */
  @Roles('admin')
  @Post('upload')
  getUploadUrl(@Req() req: Request, @Body() dto: GetUploadUrlDto) {
    return this.documentsService.getUploadUrl(req.user!.businessId, dto);
  }

  /**
   * POST /documents
   * Saves the document record after the client has confirmed the S3 upload.
   * Admin only.
   */
  @Roles('admin')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  saveDocument(@Req() req: Request, @Body() dto: SaveDocumentDto) {
    return this.documentsService.saveDocument(req.user!.businessId, req.user!.userId, dto);
  }

  /**
   * GET /documents?rawTransactionId=xxx
   * GET /documents?journalEntryId=xxx
   * Lists all documents linked to a transaction or journal entry.
   * All roles.
   */
  @Get()
  listDocuments(
    @Req() req: Request,
    @Query('rawTransactionId') rawTransactionId?: string,
    @Query('journalEntryId') journalEntryId?: string,
  ) {
    return this.documentsService.listDocuments(req.user!.businessId, {
      rawTransactionId,
      journalEntryId,
    });
  }

  /**
   * GET /documents/:id/url
   * Returns a fresh pre-signed download URL (15 min expiry).
   * All roles.
   */
  @Get(':id/url')
  getDownloadUrl(@Req() req: Request, @Param('id') id: string) {
    return this.documentsService.getDownloadUrl(req.user!.businessId, id);
  }

  /**
   * DELETE /documents/:id
   * Deletes the document record and the S3 object.
   * Admin only.
   */
  @Roles('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDocument(@Req() req: Request, @Param('id') id: string) {
    return this.documentsService.deleteDocument(req.user!.businessId, id);
  }
}
