import { IsString, IsEmail } from 'class-validator';

export class Verify2FADto {
  @IsEmail()
  email: string;

  @IsString()
  code: string;
} 