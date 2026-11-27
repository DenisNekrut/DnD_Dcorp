import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CharactersService } from './characters.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller('characters')
@UseGuards(JwtAuthGuard)
export class CharactersController {
  constructor(private readonly characters: CharactersService) {}

  @Get('personal')
  listPersonal(@Req() request: AuthenticatedRequest) {
    return this.characters.listPersonal(request.user.id);
  }

  @Post('personal')
  createPersonal(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateCharacterDto,
  ) {
    return this.characters.createPersonal(request.user.id, dto);
  }

  @Patch('personal/:characterId')
  updatePersonal(
    @Req() request: AuthenticatedRequest,
    @Param('characterId') characterId: string,
    @Body() dto: UpdateCharacterDto,
  ) {
    return this.characters.updatePersonal(request.user.id, characterId, dto);
  }

  @Delete('personal/:characterId')
  deletePersonal(
    @Req() request: AuthenticatedRequest,
    @Param('characterId') characterId: string,
  ) {
    return this.characters.deletePersonal(request.user.id, characterId);
  }

  @Post('campaigns/:campaignId/from/:characterId')
  createCampaignCopy(
    @Req() request: AuthenticatedRequest,
    @Param('campaignId') campaignId: string,
    @Param('characterId') characterId: string,
  ) {
    return this.characters.createCampaignCopy(request.user.id, campaignId, characterId);
  }

  @Get('campaigns/:campaignId')
  listCampaignCharacters(
    @Req() request: AuthenticatedRequest,
    @Param('campaignId') campaignId: string,
  ) {
    return this.characters.listCampaignCharacters(request.user.id, campaignId);
  }

  @Patch('campaign-copies/:characterId')
  updateCampaignCharacter(
    @Req() request: AuthenticatedRequest,
    @Param('characterId') characterId: string,
    @Body() dto: UpdateCharacterDto,
  ) {
    return this.characters.updateCampaignCharacter(request.user.id, characterId, dto);
  }
}
