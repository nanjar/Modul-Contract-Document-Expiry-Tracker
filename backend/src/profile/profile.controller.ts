import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  get(@Req() req: any) {
    return this.profile.get(req.user.sub);
  }

  @Patch()
  update(@Body() dto: UpdateProfileDto, @Req() req: any) {
    return this.profile.update(req.user.sub, dto);
  }

  @Patch('password')
  changePassword(@Body() dto: ChangePasswordDto, @Req() req: any) {
    return this.profile.changePassword(req.user.sub, dto.currentPassword, dto.newPassword);
  }
}
