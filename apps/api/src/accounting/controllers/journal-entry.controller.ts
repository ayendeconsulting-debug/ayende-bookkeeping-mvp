import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JournalEntryService } from '../services/journal-entry.service';
import {
  CreateJournalEntryDto,
  PostJournalEntryDto,
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
    @Body() dto: CreateJournalEntryDto,
    // TODO: Get userId from auth token
    @Query('userId') userId: string = 'test-user-id',
  ) {
    return this.journalEntryService.createJournalEntry(dto, userId);
  }

  /**
   * Post a journal entry (make it permanent)
   * POST /journal-entries/:id/post
   */
  @Post(':id/post')
  async postJournalEntry(
    @Param('id') id: string,
    @Query('postedBy') postedBy: string = 'test-user-id',
  ) {
    return this.journalEntryService.postJournalEntry({
      journal_entry_id: id,
      posted_by: postedBy,
    });
  }

  /**
   * Get all journal entries for a business
   * GET /journal-entries?businessId=xxx&status=draft
   */
  @Get()
  async getJournalEntries(
    @Query('businessId') businessId: string,
    @Query('status') status?: JournalEntryStatus,
  ) {
    return this.journalEntryService.getJournalEntries(businessId, status);
  }

  /**
   * Get a specific journal entry
   * GET /journal-entries/:id?businessId=xxx
   */
  @Get(':id')
  async getJournalEntry(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
  ) {
    return this.journalEntryService.getJournalEntry(id, businessId);
  }

  /**
   * Delete a draft journal entry
   * DELETE /journal-entries/:id?businessId=xxx
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteJournalEntry(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
  ) {
    await this.journalEntryService.deleteJournalEntry(id, businessId);
  }
}
