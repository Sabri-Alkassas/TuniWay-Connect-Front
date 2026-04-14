export type EmployeeShiftStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | string;
export type EmployeeStopStatus = 'PENDING' | 'ARRIVED' | 'DEPARTED' | 'SKIPPED' | string;

export interface EmployeeScheduleShiftDto {
  shiftId: string;
  transportId: string | null;
  transportName: string | null;
  transportType: string | null;
  transportZone: string | null;
  scheduleStart: string | null;
  scheduleEnd: string | null;
  status: EmployeeShiftStatus;
  actualStart: string | null;
  actualEnd: string | null;
}

export interface EmployeeScheduleResponse {
  message: string;
  shifts: EmployeeScheduleShiftDto[];
}

export interface EmployeeShiftStopDto {
  stopId: string;
  stopOrder: number | null;
  stopName: string;
  status: EmployeeStopStatus;
  expectedDepartureTime: string | null;
  arrivedAt: string | null;
  departedAt: string | null;
}

export interface EmployeeShiftStopsResponse {
  message: string;
  shiftId: string;
  stops: EmployeeShiftStopDto[];
}

export interface EmployeeStopActionResponse {
  message: string;
  shiftId: string;
  stopId: string;
  status: EmployeeStopStatus;
  arrivedAt: string | null;
  departedAt: string | null;
}

export interface EmployeeProgressStopDto {
  stopId: string;
  stopOrder: number | null;
  stopName: string;
  status: EmployeeStopStatus;
  expectedDepartureTime: string | null;
  arrivedAt: string | null;
  departedAt: string | null;
}

export interface EmployeeShiftProgressResponse {
  message: string;
  shiftId: string;
  shiftStatus: EmployeeShiftStatus;
  currentStop: EmployeeProgressStopDto | null;
  completedStops: EmployeeProgressStopDto[];
  completedStopsCount: number;
  totalStops: number;
  nextStop: EmployeeProgressStopDto | null;
  delayMinutes: number;
  currentLatitude: number | null;
  currentLongitude: number | null;
  currentLocationUpdatedAt: string | null;
}

export interface ShiftStartResponse {
  success: boolean;
  message: string;
  shiftId: string;
  status: EmployeeShiftStatus;
  actualStart: string | null;
}

export interface ShiftEndResponse {
  success: boolean;
  message: string;
  shiftId?: string;
  status?: EmployeeShiftStatus;
  actualEnd?: string | null;
}

export interface EmployeeShiftLocationResponse {
  success: boolean;
  message: string;
  shiftId: string;
  transportId: string | null;
  latitude: number;
  longitude: number;
  updatedAt: string | null;
}
