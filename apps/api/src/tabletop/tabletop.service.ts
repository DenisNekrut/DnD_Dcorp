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
    const visibleState = canEdit
      ? saved?.state ?? EMPTY_TABLE_STATE
      : isPublished
        ? {
            ...storedState,
            tokens: storedState?.layerVisibility && (storedState.layerVisibility as Record<string, unknown>).figures === false
              ? []
              : Array.isArray(storedState?.tokens) ? storedState.tokens : [],
            objects: (Array.isArray(storedState?.objects) ? storedState.objects : []).filter((value) => {
              if (!value || typeof value !== 'object') return false;
              const item = value as Record<string, unknown>;
              const layer = typeof item.layer === 'string'
                ? item.layer
                : item.kind === 'wall' || item.kind === 'door'
                  ? 'structures'
                  : item.kind === 'obstacle' ? 'terrain' : 'decorations';
              const visibility = (storedState?.layerVisibility as Record<string, unknown> | undefined) ?? {};
              return visibility[layer] !== false;
            }),
            mapAsset: (storedState?.layerVisibility as Record<string, unknown> | undefined)?.background === false
              ? null
              : storedState?.mapAsset ?? null,
          }
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
    const uploaded = await this.mapStorage.upload(campaignId, file);
    const saved = await this.prisma.campaignTableState.findUnique({
      where: { campaignId },
      select: { state: true },
    });
    const currentState = (saved?.state as Record<string, unknown> | undefined) ?? {};
    const previousAsset = currentState.mapAsset as { key?: string } | undefined;

    try {
      const nextState = { ...currentState, mapAsset: uploaded } as Prisma.InputJsonValue;
      await this.prisma.campaignTableState.upsert({
        where: { campaignId },
        create: { campaignId, state: nextState },
        update: { state: nextState },
      });
    } catch (error) {
      await this.mapStorage.delete(campaignId, uploaded.key).catch(() => undefined);
      throw error;
    }

    if (previousAsset?.key && previousAsset.key !== uploaded.key) {
      await this.mapStorage.delete(campaignId, previousAsset.key).catch(() => undefined);
    }
    return uploaded;
  }

  async deleteMap(userId: string, campaignId: string, key: string) {
    await this.assertCampaignAccess(userId, campaignId, true);
    const saved = await this.prisma.campaignTableState.findUnique({
      where: { campaignId },
      select: { state: true },
    });
    const currentState = (saved?.state as Record<string, unknown> | undefined) ?? {};
    const currentAsset = currentState.mapAsset as { key?: string } | undefined;
    if (currentAsset?.key !== key) throw new NotFoundException('Map asset not found');

    const nextState = { ...currentState, mapAsset: null } as Prisma.InputJsonValue;
    await this.prisma.campaignTableState.upsert({
      where: { campaignId },
      create: { campaignId, state: nextState },
      update: { state: nextState },
    });
    await this.mapStorage.delete(campaignId, key).catch(() => undefined);
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
