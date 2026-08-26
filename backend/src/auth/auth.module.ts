import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { ModuleAccessGuard } from './module-access.guard';
import { PrismaModule } from '../prisma/prisma.module';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be configured in production');
}

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      // Development keeps the documented local default; production must use
      // an explicit secret and will fail fast if it is missing.
      secret: jwtSecret ?? 'change-me',
      signOptions: {
        expiresIn: '15m',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard, ModuleAccessGuard],
  exports: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    ModuleAccessGuard,
    JwtModule,
  ],
})
export class AuthModule {}
