import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { CampaignRole, MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCampaignDto) {
    const passwordHash = dto.password
      ? await argon2.hash(dto.password, { type: argon2.argon2id })
      : null;

    return this.prisma.campaign.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        passwordHash,
        ownerId: userId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        inviteToken: true,
        applicationsOpen: true,
        createdAt: true,
      },
    });
  }

  async discover() {
    return this.prisma.campaign.findMany({
      where: { applicationsOpen: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        name: true,
        description: true,
        applicationsOpen: true,
        createdAt: true,
        owner: { select: { username: true } },
        _count: { select: { memberships: { where: { status: MembershipStatus.APPROVED } } } },
      },
    });
  }

  async mine(userId: string) {
    return this.prisma.campaign.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { memberships: { some: { userId, status: MembershipStatus.APPROVED } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        applicationsOpen: true,
        createdAt: true,
        ownerId: true,
        memberships: {
          where: { userId },
          select: { role: true, status: true },
        },
      },
    });
  }

  async requestToJoinByInvite(userId: string, inviteToken: string, password?: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { inviteToken },
      select: { id: true },
    });
    if (!campaign) throw new NotFoundException('Invitation link is invalid');
    return this.requestToJoin(userId, campaign.id, password, inviteToken);
  }

  async requestToJoin(userId: string, campaignId: string, password?: string, inviteToken?: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        ...(inviteToken ? { inviteToken } : {}),
      },
      select: { id: true, passwordHash: true, applicationsOpen: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (!campaign.applicationsOpen) throw new ForbiddenException('Campaign applications are closed');
    if (campaign.passwordHash && (!password || !(await argon2.verify(campaign.passwordHash, password)))) {
      throw new ForbiddenException('Invalid campaign password');
    }

    const existing = await this.prisma.campaignMembership.findUnique({
      where: { campaignId_userId: { campaignId: campaign.id, userId } },
    });
    if (existing) {
      if (existing.status === MembershipStatus.BLOCKED) throw new ForbiddenException('You are blocked from this campaign');
      throw new ConflictException('A membership request already exists');
    }

    return this.prisma.campaignMembership.create({
      data: { campaignId: campaign.id, userId, role: CampaignRole.PLAYER, status: MembershipStatus.PENDING },
      select: { id: true, campaignId: true, status: true, createdAt: true },
    });
  }

  async approve(userId: string, campaignId: string, membershipId: string) {
    await this.assertManager(userId, campaignId);
    const membership = await this.prisma.campaignMembership.findFirst({
      where: { id: membershipId, campaignId },
      select: { id: true, status: true },
    });
    if (!membership) throw new NotFoundException('Membership request not found');
    if (membership.status !== MembershipStatus.PENDING) throw new ConflictException('Request is no longer pending');

    return this.prisma.campaignMembership.update({
      where: { id: membershipId },
      data: { status: MembershipStatus.APPROVED },
      select: { id: true, userId: true, role: true, status: true, updatedAt: true },
    });
  }

  async reject(userId: string, campaignId: string, membershipId: string) {
    await this.assertManager(userId, campaignId);
    const membership = await this.prisma.campaignMembership.findFirst({
      where: { id: membershipId, campaignId, status: MembershipStatus.PENDING },
      select: { id: true },
    });
    if (!membership) throw new NotFoundException('Pending membership request not found');

    return this.prisma.campaignMembership.update({
      where: { id: membershipId },
      data: { status: MembershipStatus.REJECTED },
      select: { id: true, status: true, updatedAt: true },
    });
  }

  async pending(userId: string, campaignId: string) {
    await this.assertManager(userId, campaignId);
    return this.prisma.campaignMembership.findMany({
      where: { campaignId, status: MembershipStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, username: true } },
      },
    });
  }

  async setApplicationsOpen(userId: string, campaignId: string, open: boolean) {
    await this.assertManager(userId, campaignId);
    return this.prisma.campaign.update({
      where: { id: campaignId },
      data: { applicationsOpen: open },
      select: { id: true, applicationsOpen: true },
    });
  }

  async assertManager(userId: string, campaignId: string): Promise<void> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { ownerId: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.ownerId === userId) return;

    const membership = await this.prisma.campaignMembership.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
      select: { role: true, status: true },
    });
    if (
      !membership ||
      membership.status !== MembershipStatus.APPROVED ||
      membership.role !== CampaignRole.GAME_MASTER
    ) {
      throw new ForbiddenException('Only the campaign owner or an approved game master can manage members');
    }
  }
}