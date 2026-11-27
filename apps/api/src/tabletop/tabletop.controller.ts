import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { SaveTableStateDto } from './dto/save-table-state.dto';
import { DeleteMapAssetDto } from './dto/delete-map-asset.dto';
import { TabletopService } from './tabletop.service';

type AuthRequest = Request & { user: AuthenticatedUser };

@Controller('campaigns/:campaignId/table')
@UseGuards(JwtAuthGuard)
export class TabletopController {
  constructor(private readonly tabletop: TabletopService) {}

  @Get()
  getState(
    @Req() request: AuthRequest,
    @Param('campaignId') campaignId: string,
  ) {
    return this.tabletop.getState(request.user.id, campaignId);
  }

  @Post('map')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  uploadMap(
    @Req() request: AuthRequest,
    @Param('campaignId') campaignId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('Choose a map image (PNG, JPEG or WebP, up to 15 MB)');
    return this.tabletop.uploadMap(request.user.id, campaignId, file);
  }

  @Delete('map')
  deleteMap(
    @Req() request: AuthRequest,
    @Param('campaignId') campaignId: string,
    @Body() dto: DeleteMapAssetDto,
  ) {
    return this.tabletop.deleteMap(request.user.id, campaignId, dto.key);
  }

  @Put()
  saveState(
    @Req() request: AuthRequest,
    @Param('campaignId') campaignId: string,
    @Body() dto: SaveTableStateDto,
  ) {
    return this.tabletop.saveState(request.user.id, campaignId, dto);
  }
}
