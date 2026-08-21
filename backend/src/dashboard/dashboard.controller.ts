import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  @Get('summary')
  summary() {
    return { total: 0, active: 0, expiringSoon: 0, expired: 0, noExpiry: 0 };
  }

  @Get('expiring')
  expiring() {
    return [];
  }

  @Get('recent')
  recent() {
    return [];
  }
}
