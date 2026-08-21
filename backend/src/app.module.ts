import { Module } from '@nestjs/common';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentsModule } from './documents/documents.module';

@Module({
  imports: [DashboardModule, DocumentsModule],
})
export class AppModule {}
