import { IsObject, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCharacterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsObject()
  data!: Record<string, unknown>;
}
