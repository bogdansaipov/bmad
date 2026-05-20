import { Injectable } from '@nestjs/common';

@Injectable()
export class GeocodingService {
  /** Nominatim-compatible reverse geocoding. Returns human-readable address or null. */
  async reverseGeocode(_lat: number, _lng: number): Promise<string | null> {
    return null; // placeholder for future Nominatim/provider integration
  }
}
