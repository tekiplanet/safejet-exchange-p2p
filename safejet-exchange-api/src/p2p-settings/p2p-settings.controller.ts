import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { P2PSettingsService } from './p2p-settings.service';
import { UpdateP2PSettingsDto } from './dto/update-p2p-settings.dto';

@Controller('p2p-settings')
@UseGuards(JwtAuthGuard)
export class P2PSettingsController {
  constructor(private readonly p2pSettingsService: P2PSettingsService) {
    console.log('P2PSettingsController initialized');
  }

  @Get()
  getSettings(@GetUser() user: User) {
    console.log('GET /p2p-settings called for user:', user.id);
    return this.p2pSettingsService.getSettings(user.id);
  }

  @Put()
  updateSettings(
    @GetUser() user: User,
    @Body() updateSettingsDto: UpdateP2PSettingsDto,
  ) {
    return this.p2pSettingsService.updateSettings(user.id, updateSettingsDto);
  }
} 