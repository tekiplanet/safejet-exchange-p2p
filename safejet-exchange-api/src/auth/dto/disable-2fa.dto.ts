import { IsString, IsEnum } from 'class-validator';

export enum DisableCodeType {
  AUTHENTICATOR = 'authenticator',
  BACKUP = 'backup',
}

export class Disable2FADto {
  @IsString()
  code: string;

  @IsEnum(DisableCodeType)
  codeType: DisableCodeType;
}
