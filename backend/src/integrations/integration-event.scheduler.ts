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
    const result = await this.integrationEvents.processPendingEvents(10);

    if (result.processed > 0) {
      this.logger.log(`Dispatched ${result.processed} integration event(s)`);
    }
  }
}
