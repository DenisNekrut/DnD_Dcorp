import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { JoinCampaignDto } from './dto/join-campaign.dto';
import { UpdateCampaignMemberRoleDto } from './dto/update-campaign-member-role.dto';

type AuthRequest = Request & { user: AuthenticatedUser };

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get('discover')
  discover() {
    return this.campaigns.discover();
  }

  @Get('mine')
  mine(@Req() request: AuthRequest) {
    return this.campaigns.mine(request.user.id);
  }

  @Post()
  create(@Req() request: AuthRequest, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(request.user.id, dto);
  }

  @Post('join/:inviteToken')
  joinByInvite(
    @Req() request: AuthRequest,
    @Param('inviteToken') inviteToken: string,
    @Body() dto: JoinCampaignDto,
  ) {
    return this.campaigns.requestToJoinByInvite(request.user.id, inviteToken, dto.password);
  }

  @Post(':campaignId/apply')
  apply(
    @Req() request: AuthRequest,
    @Param('campaignId') campaignId: string,
    @Body() dto: JoinCampaignDto,
  ) {
    return this.campaigns.requestToJoin(request.user.id, campaignId, dto.password);
  }

  @Get(':campaignId/invite')
  invite(@Req() request: AuthRequest, @Param('campaignId') campaignId: string) {
    return this.campaigns.getInvite(request.user.id, campaignId);
  }

  @Get(':campaignId/members')
  members(@Req() request: AuthRequest, @Param('campaignId') campaignId: string) {
    return this.campaigns.members(request.user.id, campaignId);
  }

  @Post(':campaignId/members/:membershipId/role')
  updateMemberRole(
    @Req() request: AuthRequest,
    @Param('campaignId') campaignId: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateCampaignMemberRoleDto,
  ) {
    return this.campaigns.updateMemberRole(request.user.id, campaignId, membershipId, dto.role);
  }

  @Post(':campaignId/members/:membershipId/remove')
  removeMember(
    @Req() request: AuthRequest,
    @Param('campaignId') campaignId: string,
    @Param('membershipId') membershipId: string,
  ) {
    return this.campaigns.removeMember(request.user.id, campaignId, membershipId);
  }

  @Get(':campaignId/requests')
  pending(@Req() request: AuthRequest, @Param('campaignId') campaignId: string) {
    return this.campaigns.pending(request.user.id, campaignId);
  }

  @Post(':campaignId/requests/:membershipId/approve')
  approve(
    @Req() request: AuthRequest,
    @Param('campaignId') campaignId: string,
    @Param('membershipId') membershipId: string,
  ) {
    return this.campaigns.approve(request.user.id, campaignId, membershipId);
  }

  @Post(':campaignId/requests/:membershipId/reject')
  reject(
    @Req() request: AuthRequest,
    @Param('campaignId') campaignId: string,
    @Param('membershipId') membershipId: string,
  ) {
    return this.campaigns.reject(request.user.id, campaignId, membershipId);
  }

  @Post(':campaignId/applications')
  setApplicationsOpen(
    @Req() request: AuthRequest,
    @Param('campaignId') campaignId: string,
    @Query('open', ParseBoolPipe) open: boolean,
  ) {
    return this.campaigns.setApplicationsOpen(request.user.id, campaignId, open);
  }
}