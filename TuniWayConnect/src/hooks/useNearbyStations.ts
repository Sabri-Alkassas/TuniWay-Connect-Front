import { useEffect } from 'react';
import { stationsApi } from '../api/stations';
import { useLocationStore } from '../store/locationStore';

export function useNearbyStations() {
  const { latitude, longitude, setNearbyStations, setLoadingStations } = useLocationStore();

  useEffect(() => {
    if (latitude === null || longitude === null) return;

    let cancelled = false;
    const fetch = async () => {
      setLoadingStations(true);
      try {
        const res = await stationsApi.getNearby({ latitude, longitude, radiusMeters: 1000 });
        if (!cancelled) setNearbyStations(res.data);
      } catch {
        
      } finally {
        if (!cancelled) setLoadingStations(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [latitude, longitude]);
}
