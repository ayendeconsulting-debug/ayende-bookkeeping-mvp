import { Module } from '@nestjs/common';
import { CommandCenterModule } from '../command-center/command-center.module';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [CommandCenterModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
