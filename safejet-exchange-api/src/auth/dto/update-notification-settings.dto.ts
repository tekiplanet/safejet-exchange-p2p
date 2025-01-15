import { IsObject, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateNotificationSettingsDto {
  @IsObject()
  @Type(() => Object)
  notificationSettings: Record<string, Record<string, boolean>>;
} 