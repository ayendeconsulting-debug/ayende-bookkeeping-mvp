import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { CommandCenterModule } from '../command-center/command-center.module';

@Module({
  imports: [CommandCenterModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
