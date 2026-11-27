import { Controller, Get, Param, Post, Query, Body, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { BanUserDto } from './dto/ban-user.dto';

type AdminRequest = Request & { user: AuthenticatedUser };

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview') overview() { return this.admin.overview(); }
  @Get('users') users(@Query('search') search?: string) { return this.admin.listUsers(search); }
  @Post('users/:userId/ban') ban(@Req() req: AdminRequest, @Param('userId') userId: string, @Body() dto: BanUserDto) { return this.admin.banUser(req.user.id, userId, dto); }
  @Post('users/:userId/unban') unban(@Req() req: AdminRequest, @Param('userId') userId: string) { return this.admin.unbanUser(req.user.id, userId); }
  @Get('campaigns') campaigns() { return this.admin.listCampaigns(); }
  @Get('campaigns/:campaignId/observe') observe(@Param('campaignId') campaignId: string) { return this.admin.observeCampaign(campaignId); }
  @Get('audit') audit() { return this.admin.listAudit(); }
}
