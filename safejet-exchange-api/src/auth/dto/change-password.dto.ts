import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=])[A-Za-z\d!@#$%^&*(),.?":{}|<>_\-+=]{8,}$/,
    {
      message:
        'Password must contain at least 8 characters including one uppercase letter, one lowercase letter, one number and one special character',
    },
  )
  newPassword: string;
}
