import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class RollDiceDto {
  @IsInt()
  @Min(1)
  @Max(20)
  count!: number;

  @IsInt()
  @IsIn([4, 6, 8, 10, 12, 20, 100])
  sides!: number;

  @IsOptional()
  @IsInt()
  @Min(-100)
  @Max(100)
  modifier = 0;

  @IsOptional()
  @IsIn(['normal', 'advantage', 'disadvantage'])
  mode: 'normal' | 'advantage' | 'disadvantage' = 'normal';
}
