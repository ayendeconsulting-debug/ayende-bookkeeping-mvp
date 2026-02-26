import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account, AccountType, AccountSubtype } from '../../entities/account.entity';

export class CreateAccountDto {
  business_id: string;
  code: string;
  name: string;
  description?: string;
  account_type: AccountType;
  account_subtype: AccountSubtype;
  parent_account_id?: string;
}

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
  ) {}

  /**
   * Create a new account
   */
  async createAccount(dto: CreateAccountDto): Promise<Account> {
    // Check if code already exists for this business
    const existing = await this.accountRepository.findOne({
      where: {
        business_id: dto.business_id,
        code: dto.code,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Account with code ${dto.code} already exists`,
      );
    }

    // If parent account specified, verify it exists
    if (dto.parent_account_id) {
      const parent = await this.accountRepository.findOne({
        where: {
          id: dto.parent_account_id,
          business_id: dto.business_id,
        },
      });

      if (!parent) {
        throw new NotFoundException('Parent account not found');
      }
    }

    const account = this.accountRepository.create(dto);
    return this.accountRepository.save(account);
  }

  /**
   * Get all accounts for a business
   */
  async getAccounts(
    businessId: string,
    accountType?: AccountType,
    activeOnly = true,
  ): Promise<Account[]> {
    const where: any = { business_id: businessId };
    
    if (accountType) {
      where.account_type = accountType;
    }
    
    if (activeOnly) {
      where.is_active = true;
    }

    return this.accountRepository.find({
      where,
      order: { code: 'ASC' },
    });
  }

  /**
   * Get account by ID
   */
  async getAccount(id: string, businessId: string): Promise<Account> {
    const account = await this.accountRepository.findOne({
      where: { id, business_id: businessId },
      relations: ['parentAccount', 'childAccounts'],
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  /**
   * Update account
   */
  async updateAccount(
    id: string,
    businessId: string,
    updates: Partial<CreateAccountDto>,
  ): Promise<Account> {
    const account = await this.getAccount(id, businessId);

    // Prevent updating system accounts
    if (account.is_system) {
      throw new BadRequestException('Cannot modify system accounts');
    }

    Object.assign(account, updates);
    return this.accountRepository.save(account);
  }

  /**
   * Deactivate account (soft delete)
   */
  async deactivateAccount(id: string, businessId: string): Promise<Account> {
    const account = await this.getAccount(id, businessId);

    if (account.is_system) {
      throw new BadRequestException('Cannot deactivate system accounts');
    }

    // Check if account has journal entries (should use a join query in production)
    // For now, we'll just deactivate
    account.is_active = false;
    return this.accountRepository.save(account);
  }

  /**
   * Seed default chart of accounts for a new business
   */
  async seedDefaultChartOfAccounts(businessId: string): Promise<Account[]> {
    const defaultAccounts: CreateAccountDto[] = [
      // ASSETS
      {
        business_id: businessId,
        code: '1000',
        name: 'Cash',
        account_type: AccountType.ASSET,
        account_subtype: AccountSubtype.BANK,
      },
      {
        business_id: businessId,
        code: '1200',
        name: 'Accounts Receivable',
        account_type: AccountType.ASSET,
        account_subtype: AccountSubtype.ACCOUNTS_RECEIVABLE,
      },
      {
        business_id: businessId,
        code: '1500',
        name: 'Inventory',
        account_type: AccountType.ASSET,
        account_subtype: AccountSubtype.GENERAL,
      },
      {
        business_id: businessId,
        code: '1700',
        name: 'Equipment',
        account_type: AccountType.ASSET,
        account_subtype: AccountSubtype.FIXED_ASSET,
      },

      // LIABILITIES
      {
        business_id: businessId,
        code: '2000',
        name: 'Accounts Payable',
        account_type: AccountType.LIABILITY,
        account_subtype: AccountSubtype.ACCOUNTS_PAYABLE,
      },
      {
        business_id: businessId,
        code: '2100',
        name: 'Credit Card Payable',
        account_type: AccountType.LIABILITY,
        account_subtype: AccountSubtype.CREDIT_CARD,
      },
      {
        business_id: businessId,
        code: '2200',
        name: 'Sales Tax Payable',
        account_type: AccountType.LIABILITY,
        account_subtype: AccountSubtype.TAX_PAYABLE,
      },

      // EQUITY
      {
        business_id: businessId,
        code: '3000',
        name: 'Owner Contribution',
        account_type: AccountType.EQUITY,
        account_subtype: AccountSubtype.OWNER_CONTRIBUTION,
      },
      {
        business_id: businessId,
        code: '3100',
        name: 'Owner Draw',
        account_type: AccountType.EQUITY,
        account_subtype: AccountSubtype.OWNER_DRAW,
      },
      {
        business_id: businessId,
        code: '3900',
        name: 'Retained Earnings',
        account_type: AccountType.EQUITY,
        account_subtype: AccountSubtype.RETAINED_EARNINGS,
      },

      // REVENUE
      {
        business_id: businessId,
        code: '4000',
        name: 'Sales Revenue',
        account_type: AccountType.REVENUE,
        account_subtype: AccountSubtype.GENERAL,
      },
      {
        business_id: businessId,
        code: '4100',
        name: 'Service Revenue',
        account_type: AccountType.REVENUE,
        account_subtype: AccountSubtype.GENERAL,
      },

      // EXPENSES
      {
        business_id: businessId,
        code: '5000',
        name: 'Cost of Goods Sold',
        account_type: AccountType.EXPENSE,
        account_subtype: AccountSubtype.COST_OF_GOODS_SOLD,
      },
      {
        business_id: businessId,
        code: '6000',
        name: 'Rent Expense',
        account_type: AccountType.EXPENSE,
        account_subtype: AccountSubtype.OPERATING_EXPENSE,
      },
      {
        business_id: businessId,
        code: '6100',
        name: 'Utilities Expense',
        account_type: AccountType.EXPENSE,
        account_subtype: AccountSubtype.OPERATING_EXPENSE,
      },
      {
        business_id: businessId,
        code: '6200',
        name: 'Office Supplies',
        account_type: AccountType.EXPENSE,
        account_subtype: AccountSubtype.OPERATING_EXPENSE,
      },
      {
        business_id: businessId,
        code: '6300',
        name: 'Professional Fees',
        account_type: AccountType.EXPENSE,
        account_subtype: AccountSubtype.OPERATING_EXPENSE,
      },
    ];

    const accounts = defaultAccounts.map((dto) =>
      this.accountRepository.create({ ...dto, is_system: true }),
    );

    return this.accountRepository.save(accounts);
  }
}
