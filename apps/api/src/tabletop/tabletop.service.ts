import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CampaignRole, MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { SaveTableStateDto } from './dto/save-table-state.dto';

const EMPTY_TABLE_STATE = {
  tokens: [],
  initiative: [],
  round: 1,
  log: [],
};

@Injectable()
export class TabletopService {
  constructor(private readonly prisma: PrismaService) {}

  async getState(userId: string, campaignId: string) {
    await this.assertCampaignAccess(userId, campaignId, false);
    const saved = await this.prisma.campaignTableState.findUnique({
      where: { campaignId },
      select: { state: true, updatedAt: true },
    });
    return {
      campaignId,
      state: saved?.state ?? EMPTY_TABLE_STATE,
      updatedAt: saved?.updatedAt ?? null,
    };
  }

  async saveState(userId: string, campaignId: string, dto: SaveTableStateDto) {
    await this.assertCampaignAccess(userId, campaignId, true);
    const state = dto.state as Prisma.InputJsonValue;
    const saved = await this.prisma.campaignTableState.upsert({
      where: { campaignId },
      create: { campaignId, state },
      update: { state },
      select: { campaignId: true, state: true, updatedAt: true },
    });
    return saved;
  }

  private async assertCampaignAccess(
    userId: string,
    campaignId: string,
    canEdit: boolean,
  ): Promise<void> {
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
    if (!membership || membership.status !== MembershipStatus.APPROVED) {
      throw new ForbiddenException('Approved campaign membership is required');
    }

    if (
      canEdit &&
      membership.role !== CampaignRole.GAME_MASTER &&
      membership.role !== CampaignRole.ASSISTANT
    ) {
      throw new ForbiddenException('Only the game master or an assistant can edit the shared table');
    }
  }
}
