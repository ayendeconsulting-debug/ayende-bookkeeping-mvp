import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CcaAsset } from '../entities/cca-asset.entity';
import { CcaService } from './cca.service';
import { CcaController } from './cca.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CcaAsset])],
  controllers: [CcaController],
  providers: [CcaService],
  exports: [CcaService],
})
export class CcaModule {}