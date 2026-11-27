import { IsOptional, IsString, MaxLength } from 'class-validator';

export class JoinCampaignDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  password?: string;
}