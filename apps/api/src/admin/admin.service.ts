import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { BanUserDto } from './dto/ban-user.dto';

const EMPTY_TABLE_STATE = { tokens: [], initiative: [], round: 1, log: [] };

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [users, campaigns, bannedUsers, pendingMemberships] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.campaign.count(),
      this.prisma.user.count({ where: { bannedAt: { not: null }, OR: [{ bannedUntil: null }, { bannedUntil: { gt: new Date() } }] } }),
      this.prisma.campaignMembership.count({ where: { status: 'PENDING' } }),
    ]);
    return { users, campaigns, bannedUsers, pendingMemberships };
  }

  listUsers(search?: string) {
    const term = search?.trim();
    return this.prisma.user.findMany({
      where: term ? { OR: [{ username: { contains: term, mode: 'insensitive' } }, { email: { contains: term, mode: 'insensitive' } }] } : {},
      orderBy: { createdAt: 'desc' }, take: 100,
      select: { id: true, username: true, email: true, platformRole: true, createdAt: true, bannedAt: true, bannedUntil: true, banReason: true },
    });
  }

  async banUser(actorId: string, targetId: string, dto: BanUserDto) {
    if (actorId === targetId) throw new BadRequestException('You cannot ban your own administrator account');
    const target = await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true, platformRole: true } });
    if (!target) throw new NotFoundException('User not found');
    if (target.platformRole === 'ADMIN') throw new ForbiddenException('Administrator accounts cannot be banned through user moderation');
    const bannedUntil = dto.durationHours ? new Date(Date.now() + dto.durationHours * 60 * 60 * 1000) : null;
    const reason = dto.reason.trim();
    if (reason.length < 5) throw new BadRequestException('A moderation reason of at least five characters is required');
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: targetId }, data: { bannedAt: new Date(), bannedUntil, banReason: reason }, select: { id: true, username: true, email: true, bannedAt: true, bannedUntil: true, banReason: true } }),
      this.prisma.adminAction.create({ data: { actorId, targetUserId: targetId, action: 'USER_BANNED', reason, metadata: dto.durationHours ? { durationHours: dto.durationHours } : { permanent: true } } }),
    ]);
    return user;
  }

  async unbanUser(actorId: string, targetId: string) {
    if (actorId === targetId) throw new BadRequestException('Cannot change moderation status of the current administrator');
    const target = await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true, platformRole: true } });
    if (!target) throw new NotFoundException('User not found');
    if (target.platformRole === 'ADMIN') throw new ForbiddenException('Administrator accounts are managed outside user moderation');
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: targetId }, data: { bannedAt: null, bannedUntil: null, banReason: null }, select: { id: true, username: true, email: true, bannedAt: true } }),
      this.prisma.adminAction.create({ data: { actorId, targetUserId: targetId, action: 'USER_UNBANNED' } }),
    ]);
    return user;
  }

  listCampaigns() {
    return this.prisma.campaign.findMany({
      orderBy: { updatedAt: 'desc' }, take: 100,
      select: { id: true, name: true, description: true, createdAt: true, updatedAt: true, applicationsOpen: true,
        owner: { select: { id: true, username: true, email: true } },
        _count: { select: { memberships: { where: { status: 'APPROVED' } } } },
      },
    });
  }

  async observeCampaign(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, name: true, description: true, createdAt: true, updatedAt: true,
        owner: { select: { id: true, username: true, email: true } },
        memberships: { orderBy: { createdAt: 'asc' }, select: { id: true, role: true, status: true, createdAt: true, user: { select: { id: true, username: true, email: true, bannedAt: true, bannedUntil: true } } } },
        tableState: { select: { state: true, updatedAt: true } },
      },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return { ...campaign, observationOnly: true, tableState: campaign.tableState?.state ?? EMPTY_TABLE_STATE };
  }

  listAudit() {
    return this.prisma.adminAction.findMany({
      orderBy: { createdAt: 'desc' }, take: 100,
      select: { id: true, action: true, reason: true, metadata: true, createdAt: true,
        actor: { select: { id: true, username: true } }, targetUser: { select: { id: true, username: true, email: true } },
      },
    });
  }
}
