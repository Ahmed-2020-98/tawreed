import type { Localized } from '../common.js';

export interface CityDto {
  id: string;
  slug: string;
  name: string;
  names: Localized;
  region: string;
  lat: number;
  lng: number;
}

export interface RegionDto {
  id: string;
  code: string;
  name: string;
  cities: CityDto[];
}
