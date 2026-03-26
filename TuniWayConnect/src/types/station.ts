export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  lines: string[];
  distanceMeters?: number;
}

export interface NearbyStationsPayload {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}
