import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateP2PSettingsDto {
  @IsString()
  @IsOptional()
  currency?: string;

  @IsBoolean()
  @IsOptional()
  autoAcceptOrders?: boolean;

  @IsBoolean()
  @IsOptional()
  onlyVerifiedUsers?: boolean;

  @IsBoolean()
  @IsOptional()
  showOnlineStatus?: boolean;

  @IsBoolean()
  @IsOptional()
  enableInstantTrade?: boolean;

  @IsString()
  @IsOptional()
  timezone?: string;
} 