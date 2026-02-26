import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DATABASE_HOST', 'localhost'),
  port: configService.get<number>('DATABASE_PORT', 5432),
  username: configService.get<string>('DATABASE_USERNAME', 'postgres'),
  password: configService.get<string>('DATABASE_PASSWORD', 'postgres'),
  database: configService.get<string>(
    'DATABASE_NAME',
    'ayende_bookkeeping_multitenant',
  ),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false, // NEVER use true in production - we use migrations
  logging: configService.get<string>('NODE_ENV') === 'development',
  autoLoadEntities: true,
});
