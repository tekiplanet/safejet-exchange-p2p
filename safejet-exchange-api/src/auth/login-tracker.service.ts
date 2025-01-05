import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import * as geoip from 'geoip-lite';
import * as useragent from 'useragent';
import { LoginInfoDto } from './dto/login-info.dto';

@Injectable()
export class LoginTrackerService {
  getLoginInfo(req: Request): LoginInfoDto {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const geo = geoip.lookup(ip);
    const agent = useragent.parse(userAgent);

    return {
      ip,
      userAgent,
      location: {
        city: geo?.city,
        country: geo?.country,
      },
      device: {
        browser: agent.family,
        os: agent.os.family,
        device: agent.device.family,
      },
      timestamp: new Date(),
    };
  }
} 