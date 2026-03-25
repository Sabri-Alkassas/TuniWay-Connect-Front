import { useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { useLocationStore } from '../store/locationStore';

export function useLocation() {
  const { setCoords, setPermissionStatus } = useLocationStore();

  useEffect(() => {
    let watchId: number;

    const start = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setPermissionStatus('denied');
          return;
        }
      }
      setPermissionStatus('granted');
      watchId = Geolocation.watchPosition(
        (pos) => setCoords(pos.coords.latitude, pos.coords.longitude),
        () => setPermissionStatus('denied'),
        { enableHighAccuracy: true, distanceFilter: 20 },
      );
    };

    start();
    return () => {
      if (watchId !== undefined) Geolocation.clearWatch(watchId);
    };
  }, []);
}
