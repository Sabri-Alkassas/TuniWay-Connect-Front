import { create } from 'zustand';
import type { Station } from '../types/station';

type PermissionStatus = 'undetermined' | 'granted' | 'denied';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  permissionStatus: PermissionStatus;
  nearbyStations: Station[];
  isLoadingStations: boolean;
  setCoords: (latitude: number, longitude: number) => void;
  setPermissionStatus: (status: PermissionStatus) => void;
  setNearbyStations: (stations: Station[]) => void;
  setLoadingStations: (loading: boolean) => void;
  clearLocation: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  latitude: null,
  longitude: null,
  permissionStatus: 'undetermined',
  nearbyStations: [],
  isLoadingStations: false,

  setCoords: (latitude, longitude) => set({ latitude, longitude }),
  setPermissionStatus: (status) => set({ permissionStatus: status }),
  setNearbyStations: (stations) => set({ nearbyStations: stations }),
  setLoadingStations: (loading) => set({ isLoadingStations: loading }),
  clearLocation: () => set({
    latitude: null,
    longitude: null,
    nearbyStations: [],
    permissionStatus: 'undetermined',
  }),
}));
