import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { DiceService } from './dice.service';
import { RollDiceDto } from './dto/roll-dice.dto';

type AuthRequest = Request & { user: AuthenticatedUser };

@Controller('dice')
@UseGuards(JwtAuthGuard)
export class DiceController {
  constructor(private readonly dice: DiceService) {}

  @Post('roll')
  roll(@Req() _request: AuthRequest, @Body() dto: RollDiceDto) {
    return this.dice.roll(dto);
  }
}
