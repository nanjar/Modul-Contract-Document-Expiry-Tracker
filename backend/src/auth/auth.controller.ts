import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

class LoginDto { @IsEmail() email!: string; @IsString() @MinLength(8) password!: string; }

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly prisma: PrismaService) {}

  @Post('login')
  @UseGuards(AuthRateLimitGuard)
  async login(@Body() dto: LoginDto) {
    try {
      const result = await this.auth.login(dto.email, dto.password);
      await this.prisma.auditLog.create({ data: { actorId: result.user.id, action: 'LOGIN_SUCCESS', entity: 'Auth', metadata: { email: result.user.email, source: 'web' } } });
      return result;
    } catch (error) {
      await this.prisma.auditLog.create({ data: { action: 'LOGIN_FAILURE', entity: 'Auth', metadata: { email: dto.email.toLowerCase(), source: 'web' } } });
      throw error;
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        moduleAccess: { select: { module: true, permissions: true } },
      },
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: any) {
    await this.prisma.auditLog.create({ data: { actorId: req.user.sub, action: 'LOGOUT', entity: 'Auth', metadata: { source: 'web' } } });
    return { success: true };
  }
}
