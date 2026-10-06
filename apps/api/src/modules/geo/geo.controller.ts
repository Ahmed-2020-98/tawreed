import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { CityDto, RegionDto } from '@tawreed/contracts';
import { Public } from '../../common/auth/decorators.js';
import { GeoService } from './geo.service.js';

@ApiTags('geo')
@Controller('public')
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Public()
  @Get('cities')
  cities(): Promise<CityDto[]> {
    return this.geo.list();
  }

  @Public()
  @Get('regions')
  regions(): Promise<RegionDto[]> {
    return this.geo.regions();
  }
}
