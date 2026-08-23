import { Module } from '@nestjs/common';
import { IntegrationEventScheduler } from './integration-event.scheduler';
import { IntegrationEventService } from './integration-event.service';
import { N8nService } from './n8n.service';

@Module({
  providers: [N8nService, IntegrationEventService, IntegrationEventScheduler],
  exports: [N8nService, IntegrationEventService],
})
export class IntegrationsModule {}
