import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  async summary() {
    const today = new Date();
    const threshold = new Date(today);
    threshold.setDate(threshold.getDate() + Number(process.env.EXPIRY_WARNING_DAYS ?? 30));
    const [total, expiringSoon, expired, noExpiry] = await Promise.all([
      this.prisma.document.count({ where: { archivedAt: null } }),
      this.prisma.document.count({ where: { archivedAt: null, expiryDate: { gte: today, lte: threshold } } }),
      this.prisma.document.count({ where: { archivedAt: null, expiryDate: { lt: today } } }),
      this.prisma.document.count({ where: { archivedAt: null, expiryDate: null } }),
    ]);
    return { total, active: Math.max(0, total - expiringSoon - expired - noExpiry), expiringSoon, expired, noExpiry };
  }

  @Get('expiring')
  expiring() {
    return this.prisma.document.findMany({ where: { archivedAt: null, expiryDate: { not: null } }, orderBy: { expiryDate: 'asc' }, take: 10 });
  }

  @Get('recent')
  recent() {
    return this.prisma.document.findMany({ where: { archivedAt: null }, orderBy: { createdAt: 'desc' }, take: 10 });
  }
}
