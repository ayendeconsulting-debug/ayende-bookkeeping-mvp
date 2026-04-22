import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module';
import { ExpoPushService } from './expo-push.service';

@Module({
  imports: [BusinessesModule],
  providers: [ExpoPushService],
  exports: [ExpoPushService],
})
export class NotificationsModule {}
