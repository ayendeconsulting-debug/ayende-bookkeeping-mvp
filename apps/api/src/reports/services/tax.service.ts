import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxCode } from '../../entities/tax-code.entity';
import { Account, AccountSubtype } from '../../entities/account.entity';
import { CreateTaxCodeDto } from '../dto/create-tax-code.dto';
import { UpdateTaxCodeDto } from '../dto/update-tax-code.dto';

@Injectable()
export class TaxService {
  constructor(
    @InjectRepository(TaxCode)
    private readonly taxCodeRepo: Repository<TaxCode>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
  ) {}

  async create(businessId: string, dto: CreateTaxCodeDto): Promise<TaxCode> {
    await this.validateTaxAccount(businessId, dto.tax_account_id);

    const existing = await this.taxCodeRepo.findOne({
      where: { business_id: businessId, code: dto.code },
    });
    if (existing) {
      throw new BadRequestException(
        `Tax code '${dto.code}' already exists for this business`,
      );
    }

    const taxCode = this.taxCodeRepo.create({
      business_id: businessId,
      ...dto,
    });
    return this.taxCodeRepo.save(taxCode);
  }

  async findAll(businessId: string): Promise<TaxCode[]> {
    return this.taxCodeRepo.find({
      where: { business_id: businessId, is_active: true },
      relations: ['taxAccount'],
      order: { code: 'ASC' },
    });
  }

  async findOne(businessId: string, id: string): Promise<TaxCode> {
    const taxCode = await this.taxCodeRepo.findOne({
      where: { id, business_id: businessId },
      relations: ['taxAccount'],
    });
    if (!taxCode) {
      throw new NotFoundException(`Tax code ${id} not found`);
    }
    return taxCode;
  }

  async update(businessId: string, id: string, dto: UpdateTaxCodeDto): Promise<TaxCode> {
    const taxCode = await this.findOne(businessId, id);

    if (dto.tax_account_id) {
      await this.validateTaxAccount(businessId, dto.tax_account_id);
    }

    Object.assign(taxCode, dto);
    return this.taxCodeRepo.save(taxCode);
  }

  async deactivate(businessId: string, id: string): Promise<TaxCode> {
    const taxCode = await this.findOne(businessId, id);
    taxCode.is_active = false;
    return this.taxCodeRepo.save(taxCode);
  }

  // Validates the tax account exists and has subtype TAX_PAYABLE
  private async validateTaxAccount(businessId: string, accountId: string): Promise<void> {
    const account = await this.accountRepo.findOne({
      where: { id: accountId, business_id: businessId },
    });
    if (!account) {
      throw new BadRequestException(`Account ${accountId} not found`);
    }
    if (account.account_subtype !== AccountSubtype.TAX_PAYABLE) {
      throw new BadRequestException(
        `Account must have subtype 'tax_payable'. Found: '${account.account_subtype}'`,
      );
    }
  }
}
