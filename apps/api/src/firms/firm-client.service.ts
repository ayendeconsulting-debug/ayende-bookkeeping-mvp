import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Business, BusinessMode, HstReportingFrequency } from '../entities/business.entity';
import { Account } from '../entities/account.entity';
import { FirmClient, FirmClientStatus } from '../entities/firm-client.entity';
import { FirmStaff } from '../entities/firm-staff.entity';
import { AccountantFirm } from '../entities/accountant-firm.entity';
import { FirmsService } from './firms.service';
import { BusinessesService } from '../businesses/businesses.service';
import { TaxSeedService } from '../reports/services/tax-seed.service';
import { ProvinceConfigService } from '../reports/services/province-config.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';

export interface CreateClientDto {
  name: string;
  businessType: 'sole_prop' | 'corp' | 'partnership';
  country: 'CA' | 'US';
  province_code?: string;
  hst_registration_number?: string;
  hst_reporting_frequency?: HstReportingFrequency;
  seedTemplate: 'standard_ca' | 'standard_us' | 'blank';
  clientEmail?: string;
  clientFirstName?: string;
}

export interface ClientListItem {
  firmClientId: string;
  businessId: string;
  businessName: string;
  country: string;
  province_code: string | null;
  hst_registration_number: string | null;
  status: FirmClientStatus;
  added_at: Date;
}

export interface FirmBillingSummary {
  activeClients: number;
  billableClients: number;
  staffCount: number;
  billableSeats: number;
  baseMonthly: number;
  clientsMonthly: number;
  seatsMonthly: number;
  estimatedMonthly: number;
}

@Injectable()
export class FirmClientService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(FirmClient)
    private readonly firmClientRepo: Repository<FirmClient>,
    @InjectRepository(FirmStaff)
    private readonly firmStaffRepo: Repository<FirmStaff>,
    @InjectRepository(AccountantFirm)
    private readonly firmRepo: Repository<AccountantFirm>,
    private readonly firmsService: FirmsService,
    private readonly businessesService: BusinessesService,
    private readonly taxSeedService: TaxSeedService,
    private readonly provinceConfigService: ProvinceConfigService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // ── List ───────────────────────────────────────────────────────────────────

  async listClients(clerkUserId: string): Promise<ClientListItem[]> {
    const firm = await this.firmsService.getMyFirm(clerkUserId);

    const rows = await this.firmClientRepo.find({
      where: { firm_id: firm.id },
      relations: ['business'],
      order: { added_at: 'DESC' },
    });

    return rows.map((fc) => ({
      firmClientId: fc.id,
      businessId: fc.business_id,
      businessName: fc.business?.name ?? '—',
      country: fc.business?.country ?? '—',
      province_code: fc.business?.province_code ?? null,
      hst_registration_number: fc.business?.hst_registration_number ?? null,
      status: fc.status,
      added_at: fc.added_at,
    }));
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  async createClient(
    clerkUserId: string,
    dto: CreateClientDto,
  ): Promise<{ business: Business; firmClient: FirmClient }> {
    const firm = await this.firmsService.getMyFirm(clerkUserId);

    if (dto.province_code) {
      const provinceConfig = await this.provinceConfigService.getProvinceConfig(
        dto.province_code,
      );
      if (!provinceConfig) {
        throw new BadRequestException(
          `Invalid province code: ${dto.province_code}.`,
        );
      }
    }

    const modeMap: Record<string, BusinessMode> = {
      sole_prop: BusinessMode.FREELANCER,
      corp: BusinessMode.BUSINESS,
      partnership: BusinessMode.BUSINESS,
    };

    const { business, firmClient } = await this.dataSource.transaction(
      async (manager) => {
        const business = manager.create(Business, {
          name: dto.name,
          country: dto.country,
          currency_code: dto.country === 'CA' ? 'CAD' : 'USD',
          mode: modeMap[dto.businessType] ?? BusinessMode.BUSINESS,
          clerk_org_id: null,
          created_by_firm_id: firm.id,
          province_code: dto.province_code ?? null,
          hst_registration_number: dto.hst_registration_number ?? null,
          hst_reporting_frequency:
            (dto.hst_reporting_frequency as HstReportingFrequency) ?? null,
          settings: {},
        });
        const savedBusiness = await manager.save(Business, business);

        const firmClient = manager.create(FirmClient, {
          firm_id: firm.id,
          business_id: savedBusiness.id,
          status: FirmClientStatus.ACTIVE,
        });
        const savedFirmClient = await manager.save(FirmClient, firmClient);

        return { business: savedBusiness, firmClient: savedFirmClient };
      },
    );

    if (dto.seedTemplate !== 'blank') {
      await this.businessesService.seedAccounts(business.id, 'services');
    }

    if (dto.country === 'CA' && dto.province_code) {
      const provinceConfig = await this.provinceConfigService.getProvinceConfig(
        dto.province_code,
      );
      if (provinceConfig) {
        await this.taxSeedService.seedDefaultTaxCodes(business.id, provinceConfig);
      }
    }

    if (dto.clientEmail) {
      const appUrl = this.config.get<string>('APP_URL') ?? 'https://gettempo.ca';
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 60);
      const formattedDate = trialEndDate.toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      void this.emailService.sendWelcome(dto.clientEmail, {
        firstName: dto.clientFirstName ?? 'there',
        trialEndDate: formattedDate,
        dashboardUrl: `${appUrl}/dashboard`,
      });
    }

    return { business, firmClient };
  }

  // ── Archive ────────────────────────────────────────────────────────────────

  async archiveClient(clerkUserId: string, firmClientId: string): Promise<void> {
    const firm = await this.firmsService.getMyFirm(clerkUserId);

    const firmClient = await this.firmClientRepo.findOne({
      where: { id: firmClientId, firm_id: firm.id },
    });

    if (!firmClient) {
      throw new NotFoundException(
        'Client not found or does not belong to your firm.',
      );
    }

    if (firmClient.status === FirmClientStatus.ARCHIVED) {
      throw new BadRequestException('This client is already archived.');
    }

    firmClient.status = FirmClientStatus.ARCHIVED;
    await this.firmClientRepo.save(firmClient);
  }

  // ── Billing summary ────────────────────────────────────────────────────────

  async getBillingSummary(clerkUserId: string): Promise<FirmBillingSummary> {
    const firm = await this.firmsService.getMyFirm(clerkUserId);

    const [activeClients, staffCount] = await Promise.all([
      this.firmClientRepo.count({
        where: { firm_id: firm.id, status: FirmClientStatus.ACTIVE },
      }),
      this.firmStaffRepo.count({
        where: { firm_id: firm.id },
      }),
    ]);

    const billableClients  = Math.max(0, activeClients - 5);
    const billableSeats    = Math.max(0, staffCount - 3);
    const BASE_MONTHLY     = 149;
    const PER_CLIENT       = 15;
    const PER_SEAT         = 25;
    const clientsMonthly   = billableClients * PER_CLIENT;
    const seatsMonthly     = billableSeats * PER_SEAT;
    const estimatedMonthly = BASE_MONTHLY + clientsMonthly + seatsMonthly;

    return {
      activeClients,
      billableClients,
      staffCount,
      billableSeats,
      baseMonthly: BASE_MONTHLY,
      clientsMonthly,
      seatsMonthly,
      estimatedMonthly,
    };
  }
}
