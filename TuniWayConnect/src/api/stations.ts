import { client } from './client';
import type { Station, NearbyStationsPayload } from '../types/station';

export const stationsApi = {
  getNearby: (payload: NearbyStationsPayload) =>
    client.post<Station[]>('/stations/nearby', payload),

  getById: (stationId: string) =>
    client.get<Station>(`/stations/${stationId}`),
};
