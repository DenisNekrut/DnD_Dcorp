import { BadRequestException, Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { RollDiceDto } from './dto/roll-dice.dto';

@Injectable()
export class DiceService {
  roll(dto: RollDiceDto) {
    const mode = dto.mode ?? 'normal';
    if (mode !== 'normal' && dto.sides !== 20) {
      throw new BadRequestException('Advantage and disadvantage are available only for d20 rolls');
    }
    if (mode !== 'normal' && dto.count !== 1) {
      throw new BadRequestException('Advantage and disadvantage apply to one d20 check');
    }

    const rolls = mode === 'normal'
      ? Array.from({ length: dto.count }, () => randomInt(1, dto.sides + 1))
      : [randomInt(1, 21), randomInt(1, 21)];
    const keptRoll = mode === 'advantage'
      ? Math.max(...rolls)
      : mode === 'disadvantage'
        ? Math.min(...rolls)
        : null;
    const subtotal = keptRoll ?? rolls.reduce((sum, value) => sum + value, 0);
    const modifier = dto.modifier ?? 0;

    return {
      notation: `${dto.count}d${dto.sides}${modifier > 0 ? '+' : ''}${modifier || ''}`,
      mode,
      rolls,
      keptRoll,
      modifier,
      total: subtotal + modifier,
      rolledAt: new Date().toISOString(),
    };
  }
}
