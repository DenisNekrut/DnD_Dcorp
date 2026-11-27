import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCharacterDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
