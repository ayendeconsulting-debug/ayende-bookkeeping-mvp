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
import { JournalEntryService } from '../services/journal-entry.service';
import {
  CreateJournalEntryDto,
} from '../services/dto/create-journal-entry.dto';
import { JournalEntryStatus } from '../../entities/journal-entry.entity';

@Controller('journal-entries')
export class JournalEntryController {
  constructor(private readonly journalEntryService: JournalEntryService) {}

  /**
   * Create a new journal entry in DRAFT status
   * POST /journal-entries
   */
  @Post()
  async createJournalEntry(
    @Req() req: Request,
    @Body() dto: CreateJournalEntryDto,
  ) {
    return this.journalEntryService.createJournalEntry(dto, req.user!.userId);
  }

  /**
   * Post a journal entry (make it permanent)
   * POST /journal-entries/:id/post
   */
  @Post(':id/post')
  async postJournalEntry(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.journalEntryService.postJournalEntry({
      journal_entry_id: id,
      posted_by: req.user!.userId,
    });
  }

  /**
   * Get all journal entries for a business
   * GET /journal-entries?status=draft
   */
  @Get()
  async getJournalEntries(
    @Req() req: Request,
    @Query('status') status?: JournalEntryStatus,
  ) {
    return this.journalEntryService.getJournalEntries(req.user!.businessId, status);
  }

  /**
   * Get a specific journal entry
   * GET /journal-entries/:id
   */
  @Get(':id')
  async getJournalEntry(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.journalEntryService.getJournalEntry(id, req.user!.businessId);
  }

  /**
   * Delete a draft journal entry
   * DELETE /journal-entries/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteJournalEntry(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    await this.journalEntryService.deleteJournalEntry(id, req.user!.businessId);
  }
}
