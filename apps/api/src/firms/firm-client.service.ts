import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Business, BusinessMode, HstReportingFrequency } from '../entities/business.entity';
import { Account } from '../entities/account.entity';
import { FirmClient, FirmClientStatus } from '../entities/firm-client.entity';
import { AccountantFirm } from '../entities/accountant-firm.entity';
import { FirmsService } from './firms.service';
import { BusinessesService } from '../businesses/businesses.service';
import { TaxSeedService } from '../reports/services/tax-seed.service';
import { ProvinceConfigService } from '../reports/services/province-config.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';

export interface CreateClientDto {
  // Step 1 — Business details
  name: string;
  businessType: 'sole_prop' | 'corp' | 'partnership';
  country: 'CA' | 'US';
  // Step 2 — Tax settings (CA only, all optional)
  province_code?: string;
  hst_registration_number?: string;
  hst_reporting_frequency?: HstReportingFrequency;
  // Step 3 — Chart of accounts seed template
  seedTemplate: 'standard_ca' | 'standard_us' | 'blank';
  // Step 4 — Optional client invite
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

@Injectable()
export class FirmClientService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(FirmClient)
    private readonly firmClientRepo: Repository<FirmClient>,
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

  /**
   * Creates a new client business and links it to the firm atomically.
   * Account seed and tax seed run after the transaction (idempotent).
   * Optionally sends a client invite email via Resend.
   */
  async createClient(
    clerkUserId: string,
    dto: CreateClientDto,
  ): Promise<{ business: Business; firmClient: FirmClient }> {
    const firm = await this.firmsService.getMyFirm(clerkUserId);

    // Validate province if provided
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

    // Map businessType to BusinessMode
    const modeMap: Record<string, BusinessMode> = {
      sole_prop: BusinessMode.FREELANCER,
      corp: BusinessMode.BUSINESS,
      partnership: BusinessMode.BUSINESS,
    };

    // ── Atomic: create business + firm_client link ──────────────────────────
    const { business, firmClient } = await this.dataSource.transaction(
      async (manager) => {
        const business = manager.create(Business, {
          name: dto.name,
          country: dto.country,
          currency_code: dto.country === 'CA' ? 'CAD' : 'USD',
          mode: modeMap[dto.businessType] ?? BusinessMode.BUSINESS,
          clerk_org_id: null, // accountant-created — no Clerk org
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

    // ── Post-transaction: seed accounts ────────────────────────────────────
    if (dto.seedTemplate !== 'blank') {
      const industry =
        dto.country === 'CA' ? 'services' : 'services'; // default — wizard Step 3 can refine
      await this.businessesService.seedAccounts(business.id, industry);
    }

    // ── Post-transaction: seed tax codes (CA only, if province set) ─────────
    if (dto.country === 'CA' && dto.province_code) {
      const provinceConfig = await this.provinceConfigService.getProvinceConfig(
        dto.province_code,
      );
      if (provinceConfig) {
        await this.taxSeedService.seedDefaultTaxCodes(business.id, provinceConfig);
      }
    }

    // ── Optional: send client invite email ──────────────────────────────────
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

  /**
   * Soft-deletes a firm_client link (sets status = archived).
   * Business data is retained and unaffected.
   */
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
}
