export class LoginInfoDto {
  ip: string;
  userAgent: string;
  location?: {
    city?: string;
    country?: string;
  };
  device?: {
    browser?: string;
    os?: string;
    device?: string;
  };
  timestamp: Date;
} 