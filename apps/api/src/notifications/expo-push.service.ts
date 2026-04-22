import { Injectable, Logger } from '@nestjs/common';
import { BusinessesService } from '../businesses/businesses.service';

/**
 * Internal push message shape used by all backend triggers.
 * The _businessId field is stripped before POSTing to Expo; it is
 * retained on the input so DeviceNotRegistered receipts can be mapped
 * back to a business row for token cleanup.
 */
export interface InternalExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default';
  _businessId: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH_SIZE = 100;
const EXPO_TIMEOUT_MS = 5000;

/**
 * Thin HTTP client around the Expo Push API.
 * All methods are fire-and-forget: failures are logged, never thrown.
 */
@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);

  constructor(private readonly businessesService: BusinessesService) {}

  /**
   * Send one or more push notifications.
   * Chunks into batches of 100 per the Expo API limit.
   * Never throws -- all errors are logged and swallowed.
   */
  async send(messages: InternalExpoPushMessage[]): Promise<void> {
    if (!messages.length) return;

    for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
      const batch = messages.slice(i, i + EXPO_BATCH_SIZE);
      await this.sendBatch(batch);
    }
  }

  private async sendBatch(batch: InternalExpoPushMessage[]): Promise<void> {
    // Strip internal field before POSTing -- Expo ignores unknown fields, but
    // we keep payloads clean.
    const outbound = batch.map(({ _businessId, ...rest }) => rest);

    let tickets: ExpoPushTicket[];
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(outbound),
        signal: AbortSignal.timeout(EXPO_TIMEOUT_MS),
      });

      if (!response.ok) {
        this.logger.warn(
          `Expo Push API returned ${response.status} ${response.statusText}`,
        );
        return;
      }

      const json = (await response.json()) as { data?: ExpoPushTicket[] };
      tickets = json.data ?? [];
    } catch (err: any) {
      this.logger.warn(`Expo Push API call failed: ${err?.message ?? err}`);
      return;
    }

    // Tickets are returned in input order -- index back to _businessId.
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const message = batch[i];

      if (ticket.status !== 'error') continue;

      const errorType = ticket.details?.error;
      this.logger.warn(
        `Expo push error for business ${message._businessId}: ${errorType ?? ticket.message ?? 'unknown'}`,
      );

      if (errorType === 'DeviceNotRegistered') {
        try {
          await this.businessesService.updatePushToken(message._businessId, null);
          this.logger.log(
            `Cleared stale push token for business ${message._businessId}`,
          );
        } catch (cleanupErr: any) {
          this.logger.warn(
            `Failed to clear stale token for ${message._businessId}: ${cleanupErr?.message ?? cleanupErr}`,
          );
        }
      }
    }
  }
}
