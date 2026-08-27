import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IntegrationEventService } from './integration-event.service';

@Injectable()
export class IntegrationEventScheduler {
  private readonly logger = new Logger(IntegrationEventScheduler.name);

  constructor(private readonly integrationEvents: IntegrationEventService) {}

  @Cron('*/10 * * * * *')
  async dispatchPendingEvents() {
    this.logger.debug('Integration event cron tick');

    // Recover events left in PROCESSING by a crashed worker before claiming
    // the next batch. This makes delivery eventually recoverable after restarts.
    const recovered = await this.integrationEvents.recoverStaleEvents();
    if (recovered > 0) {
      this.logger.warn(`Recovered ${recovered} stale integration event(s)`);
    }

    const result = await this.integrationEvents.processPendingEvents(10);

    if (result.processed > 0) {
      this.logger.log(`Dispatched ${result.processed} integration event(s)`);
    }
  }
}
