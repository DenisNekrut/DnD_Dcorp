import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class BanUserDto {
  @IsString()
  @MinLength(5)
  reason!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8760)
  durationHours?: number;
}
