import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAgreement } from '../entities/user-agreement.entity';
import { LegalService } from './legal.service';
import { LegalController } from './legal.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserAgreement])],
  controllers: [LegalController],
  providers: [LegalService],
  exports: [LegalService],
})
export class LegalModule {}
