import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CampaignRole, MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { normalizeCharacterData } from './character-rules';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';

@Injectable()
export class CharactersService {
  constructor(private readonly prisma: PrismaService) {}

  async listPersonal(userId: string) {
    return this.prisma.character.findMany({
      where: { ownerId: userId, isCampaignCopy: false, campaignId: null },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, data: true, createdAt: true, updatedAt: true },
    });
  }

  async createPersonal(userId: string, dto: CreateCharacterDto) {
    return this.prisma.character.create({
      data: {
        name: dto.name.trim(),
        ownerId: userId,
        isCampaignCopy: false,
        data: normalizeCharacterData(dto.data) as Prisma.InputJsonValue,
      },
      select: { id: true, name: true, data: true, createdAt: true, updatedAt: true },
    });
  }

  async updatePersonal(userId: string, characterId: string, dto: UpdateCharacterDto) {
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, ownerId: userId, isCampaignCopy: false, campaignId: null },
      select: { id: true, name: true, data: true },
    });
    if (!character) throw new NotFoundException('Personal character not found');

    const data = dto.data
      ? normalizeCharacterData({ ...(character.data as Record<string, unknown>), ...dto.data })
      : undefined;
    return this.prisma.character.update({
      where: { id: character.id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(data ? { data: data as Prisma.InputJsonValue } : {}),
      },
      select: { id: true, name: true, data: true, createdAt: true, updatedAt: true },
    });
  }

  async deletePersonal(userId: string, characterId: string) {
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, ownerId: userId, isCampaignCopy: false, campaignId: null },
      select: { id: true },
    });
    if (!character) throw new NotFoundException('Personal character not found');
    await this.prisma.character.delete({ where: { id: character.id } });
    return { deleted: true };
  }

  async createCampaignCopy(userId: string, campaignId: string, sourceCharacterId: string) {
    const access = await this.assertCampaignMember(userId, campaignId);
    if (access.role === CampaignRole.OBSERVER) {
      throw new ForbiddenException('Observers cannot add characters to a campaign');
    }

    const source = await this.prisma.character.findFirst({
      where: {
        id: sourceCharacterId,
        ownerId: userId,
        isCampaignCopy: false,
        campaignId: null,
      },
      select: { id: true, name: true, data: true },
    });
    if (!source) throw new NotFoundException('Personal character not found');

    const existing = await this.prisma.character.findFirst({
      where: { sourceCharacterId: source.id, campaignId, isCampaignCopy: true },
      select: { id: true },
    });
    if (existing) throw new ConflictException('This character already has a copy in the campaign');

    return this.prisma.character.create({
      data: {
        name: source.name,
        ownerId: userId,
        campaignId,
        sourceCharacterId: source.id,
        isCampaignCopy: true,
        data: JSON.parse(JSON.stringify(source.data)) as Prisma.InputJsonValue,
      },
      select: { id: true, name: true, ownerId: true, campaignId: true, data: true, createdAt: true, updatedAt: true },
    });
  }

  async listCampaignCharacters(userId: string, campaignId: string) {
    await this.assertCampaignMember(userId, campaignId);
    return this.prisma.character.findMany({
      where: { campaignId, isCampaignCopy: true },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        ownerId: true,
        data: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: { username: true } },
      },
    });
  }

  async updateCampaignCharacter(userId: string, characterId: string, dto: UpdateCharacterDto) {
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, isCampaignCopy: true, campaignId: { not: null } },
      select: { id: true, name: true, ownerId: true, campaignId: true, data: true },
    });
    if (!character || !character.campaignId) throw new NotFoundException('Campaign character not found');

    const access = await this.assertCampaignMember(userId, character.campaignId);
    const canEditAny = access.isOwner || access.role === CampaignRole.GAME_MASTER;
    if (!canEditAny && character.ownerId !== userId) {
      throw new ForbiddenException('You can only edit your own campaign character');
    }
    if (access.role === CampaignRole.OBSERVER) {
      throw new ForbiddenException('Observers have read-only access');
    }

    const data = dto.data
      ? normalizeCharacterData({ ...(character.data as Record<string, unknown>), ...dto.data })
      : undefined;
    return this.prisma.character.update({
      where: { id: character.id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(data ? { data: data as Prisma.InputJsonValue } : {}),
      },
      select: { id: true, name: true, ownerId: true, campaignId: true, data: true, createdAt: true, updatedAt: true },
    });
  }

  private async assertCampaignMember(userId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { ownerId: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.ownerId === userId) {
      return { isOwner: true, role: CampaignRole.GAME_MASTER };
    }

    const membership = await this.prisma.campaignMembership.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
      select: { role: true, status: true },
    });
    if (!membership || membership.status !== MembershipStatus.APPROVED) {
      throw new ForbiddenException('You are not an approved member of this campaign');
    }
    return { isOwner: false, role: membership.role };
  }
}
