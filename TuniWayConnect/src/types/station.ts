export interface Station {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  walkMinutes: number;
  type: 'BUS' | 'METRO' | 'TGM' | 'LOUAGE';
  isOpen: boolean;
  lineCount: number;
}