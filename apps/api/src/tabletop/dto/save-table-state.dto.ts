import { IsObject } from 'class-validator';

export class SaveTableStateDto {
  @IsObject()
  state!: Record<string, unknown>;
}
