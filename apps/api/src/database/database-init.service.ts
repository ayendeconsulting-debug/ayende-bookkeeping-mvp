import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.createMaterializedView();
  }

  private async createMaterializedView(): Promise<void> {
    try {
      // Create the materialized view if it doesn't already exist
      await this.dataSource.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS account_balances AS
        SELECT
          jl.account_id,
          jl.business_id,
          SUM(jl.debit_amount)  AS total_debits,
          SUM(jl.credit_amount) AS total_credits,
          SUM(jl.debit_amount) - SUM(jl.credit_amount) AS balance
        FROM journal_lines jl
        INNER JOIN journal_entries je ON je.id = jl.journal_entry_id
        WHERE je.status = 'posted'
        GROUP BY jl.account_id, jl.business_id
      `);

      // Create unique index if it doesn't exist
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS account_balances_account_id_business_id_idx
        ON account_balances (account_id, business_id)
      `);

      this.logger.log('account_balances materialized view ready');
    } catch (error) {
      // Log but don't crash — view may already exist with the index
      this.logger.warn(`Materialized view init: ${error.message}`);
    }
  }
}
