import { client } from './client';
import type { Station } from '../types/station';

export const stationsApi = {
  getNearby: (payload: { latitude: number; longitude: number; radiusMeters?: number }) =>
    client.post<Station[]>('/stations/nearby', payload),
  getById: (stationId: string) =>
    client.get<Station>(`/stations/${stationId}`),
};
