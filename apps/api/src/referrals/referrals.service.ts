import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralPartner } from '../entities/referral-partner.entity';
import { ReferralEvent } from '../entities/referral-event.entity';
import { ReferralCommission } from '../entities/referral-commission.entity';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(ReferralPartner)
    private readonly partnerRepo: Repository<ReferralPartner>,
    @InjectRepository(ReferralEvent)
    private readonly eventRepo: Repository<ReferralEvent>,
    @InjectRepository(ReferralCommission)
    private readonly commissionRepo: Repository<ReferralCommission>,
  ) {}
}
