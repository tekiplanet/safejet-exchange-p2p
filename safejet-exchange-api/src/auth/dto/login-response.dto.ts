export class LoginResponseDto {
  user: any;
  accessToken?: string;
  refreshToken?: string;
  requires2FA?: boolean;
  tempToken?: string;
}
