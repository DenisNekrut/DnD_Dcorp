import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CampaignRole, MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { SaveTableStateDto } from './dto/save-table-state.dto';
import { MapStorageService } from './map-storage.service';

const EMPTY_TABLE_STATE = {
  tokens: [],
  initiative: [],
  round: 1,
  log: [],
};

@Injectable()
export class TabletopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapStorage: MapStorageService,
  ) {}

  async getState(userId: string, campaignId: string) {
    const canEdit = await this.assertCampaignAccess(userId, campaignId, false);
    const saved = await this.prisma.campaignTableState.findUnique({
      where: { campaignId },
      select: { state: true, updatedAt: true },
    });
    const storedState = saved?.state as Record<string, unknown> | undefined;
    const storedRoom = storedState?.room as Record<string, unknown> | undefined;
    const isPublished = storedRoom?.published === true;
    const visibleState = canEdit || isPublished
      ? saved?.state ?? EMPTY_TABLE_STATE
      : {
          room: { configured: false, published: false },
          tokens: [],
          objects: [],
          round: 1,
          log: [],
        };
    return {
      campaignId,
      state: visibleState,
      updatedAt: saved?.updatedAt ?? null,
      permissions: { canEdit },
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
    return { ...saved, permissions: { canEdit: true } };
  }

  async uploadMap(userId: string, campaignId: string, file: Express.Multer.File) {
    await this.assertCampaignAccess(userId, campaignId, true);
    return this.mapStorage.upload(campaignId, file);
  }

  async deleteMap(userId: string, campaignId: string, key: string) {
    await this.assertCampaignAccess(userId, campaignId, true);
    await this.mapStorage.delete(campaignId, key);
    return { deleted: true };
  }

  private async assertCampaignAccess(
    userId: string,
    campaignId: string,
    requireEdit: boolean,
  ): Promise<boolean> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { ownerId: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.ownerId === userId) return true;

    const membership = await this.prisma.campaignMembership.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
      select: { role: true, status: true },
    });
    if (!membership || membership.status !== MembershipStatus.APPROVED) {
      throw new ForbiddenException('Approved campaign membership is required');
    }

    const canEdit =
      membership.role === CampaignRole.GAME_MASTER ||
      membership.role === CampaignRole.ASSISTANT;
    if (requireEdit && !canEdit) {
      throw new ForbiddenException('Only the game master or an assistant can edit the shared table');
    }
    return canEdit;
  }
}
