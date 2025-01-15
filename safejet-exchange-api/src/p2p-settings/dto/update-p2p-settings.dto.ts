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

  // Ensure only one property is set
  constructor(partial: Partial<UpdateP2PSettingsDto>) {
    const keys = Object.keys(partial);
    if (keys.length !== 1) {
      throw new Error('Only one setting can be updated at a time');
    }
    Object.assign(this, partial);
  }
} 