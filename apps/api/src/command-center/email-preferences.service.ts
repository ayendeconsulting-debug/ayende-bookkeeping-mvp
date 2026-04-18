import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailPreferences } from './email-preferences.entity';
import { UnsubscribeCategory } from './unsubscribe.helper';

export interface PreferenceFlags {
  unsubscribe_tips: boolean;
  unsubscribe_broadcasts: boolean;
  unsubscribe_partnership: boolean;
  unsubscribe_cold: boolean;
  unsubscribed_all: boolean;
}

@Injectable()
export class EmailPreferencesService {
  constructor(
    @InjectRepository(EmailPreferences)
    private readonly repo: Repository<EmailPreferences>,
  ) {}

  async getPreferences(email: string): Promise<PreferenceFlags> {
    const normalised = email.toLowerCase().trim();
    const prefs = await this.repo.findOne({ where: { email: normalised } });
    if (!prefs) {
      return {
        unsubscribe_tips: false,
        unsubscribe_broadcasts: false,
        unsubscribe_partnership: false,
        unsubscribe_cold: false,
        unsubscribed_all: false,
      };
    }
    return {
      unsubscribe_tips:        prefs.unsubscribe_tips,
      unsubscribe_broadcasts:  prefs.unsubscribe_broadcasts,
      unsubscribe_partnership: prefs.unsubscribe_partnership,
      unsubscribe_cold:        prefs.unsubscribe_cold,
      unsubscribed_all:        prefs.unsubscribed_all,
    };
  }

  async upsertPreferences(email: string, flags: PreferenceFlags): Promise<void> {
    const normalised = email.toLowerCase().trim();
    const existing = await this.repo.findOne({ where: { email: normalised } });
    if (existing) {
      Object.assign(existing, flags);
      await this.repo.save(existing);
    } else {
      await this.repo.save(this.repo.create({ email: normalised, ...flags }));
    }
  }

  async isUnsubscribed(email: string, category: UnsubscribeCategory): Promise<boolean> {
    const normalised = email.toLowerCase().trim();
    const prefs = await this.repo.findOne({ where: { email: normalised } });
    if (!prefs) return false;
    if (prefs.unsubscribed_all) return true;
    switch (category) {
      case 'tips':        return prefs.unsubscribe_tips;
      case 'broadcasts':  return prefs.unsubscribe_broadcasts;
      case 'partnership': return prefs.unsubscribe_partnership;
      case 'cold':        return prefs.unsubscribe_cold;
      default:            return false;
    }
  }

  async getAllUnsubscribes(): Promise<EmailPreferences[]> {
    return this.repo.find({ order: { updated_at: 'DESC' } });
  }
}
