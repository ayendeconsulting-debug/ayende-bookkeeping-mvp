import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  // DIRECT_DATABASE_URL — non-pooled, used when explicitly set (e.g. manual migrations)
  // DATABASE_URL        — PgBouncer pooled URL in production (Railway)
  const directUrl   = configService.get<string>('DIRECT_DATABASE_URL');
  const databaseUrl = configService.get<string>('DATABASE_URL');

  const activeUrl = directUrl ?? databaseUrl;

  // Railway production — use pooled or direct URL
  if (activeUrl) {
    return {
      type: 'postgres',
      url: activeUrl,
      ssl: { rejectUnauthorized: false }, // Required for Railway PostgreSQL
      entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
      synchronize: true,
      logging: false,
      // Cap connection pool to stay within PgBouncer limits.
      // PgBouncer default pool_size is 10 per database — match it here.
      extra: {
        max: 10,
        // Statement timeout — prevents long-running queries from holding
        // PgBouncer connections. 30s is generous for API workloads.
        statement_timeout: 30000,
      },
    };
  }

  // Local development — use individual env vars (no PgBouncer)
  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'postgres'),
    database: configService.get<string>(
      'DB_NAME',
      'ayende_bookkeeping_multitenant',
    ),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: true,
    logging: true,
  };
};
