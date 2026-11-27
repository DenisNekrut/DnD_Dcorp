import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { SaveTableStateDto } from './dto/save-table-state.dto';
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

  @Put()
  saveState(
    @Req() request: AuthRequest,
    @Param('campaignId') campaignId: string,
    @Body() dto: SaveTableStateDto,
  ) {
    return this.tabletop.saveState(request.user.id, campaignId, dto);
  }
}
