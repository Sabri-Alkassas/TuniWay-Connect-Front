import { apiClient } from '../lib/apiClient';
import type {
  EmployeeProgressStopDto,
  EmployeeScheduleResponse,
  EmployeeScheduleShiftDto,
  EmployeeShiftLocationResponse,
  EmployeeShiftProgressResponse,
  EmployeeShiftStopDto,
  EmployeeShiftStopsResponse,
  EmployeeStopActionResponse,
  ShiftEndResponse,
  ShiftStartResponse,
} from '../types/employee';

type WrappedResponse<T> = Promise<{ data: { data: T } }>;

function wrapData<T>(data: T): { data: { data: T } } {
  return { data: { data } };
}

function normalizeShiftStatus(status: unknown): EmployeeScheduleShiftDto['status'] {
  return String(status ?? 'SCHEDULED').trim().toUpperCase();
}

function normalizeStopStatus(status: unknown): EmployeeShiftStopDto['status'] {
  return String(status ?? 'PENDING').trim().toUpperCase();
}

function normalizeIso(value: unknown): string | null {
  return value ? String(value) : null;
}

function normalizeCoordinate(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeShift(dto: any): EmployeeScheduleShiftDto {
  return {
    shiftId: String(dto?.shiftId ?? ''),
    transportId: dto?.transportId != null ? String(dto.transportId) : null,
    transportName: dto?.transportName ?? null,
    transportType: dto?.transportType ?? null,
    transportZone: dto?.transportZone ?? null,
    scheduleStart: normalizeIso(dto?.scheduleStart),
    scheduleEnd: normalizeIso(dto?.scheduleEnd),
    status: normalizeShiftStatus(dto?.status),
    actualStart: normalizeIso(dto?.actualStart),
    actualEnd: normalizeIso(dto?.actualEnd),
  };
}

function normalizeStop(dto: any): EmployeeShiftStopDto {
  return {
    stopId: String(dto?.stopId ?? ''),
    stopOrder: dto?.stopOrder != null ? Number(dto.stopOrder) : null,
    stopName: dto?.stopName ?? '',
    status: normalizeStopStatus(dto?.status),
    expectedDepartureTime: normalizeIso(dto?.expectedDepartureTime),
    arrivedAt: normalizeIso(dto?.arrivedAt),
    departedAt: normalizeIso(dto?.departedAt),
  };
}

function normalizeProgressStop(dto: any): EmployeeProgressStopDto {
  return {
    stopId: String(dto?.stopId ?? ''),
    stopOrder: dto?.stopOrder != null ? Number(dto.stopOrder) : null,
    stopName: dto?.stopName ?? '',
    status: normalizeStopStatus(dto?.status),
    expectedDepartureTime: normalizeIso(dto?.expectedDepartureTime),
    arrivedAt: normalizeIso(dto?.arrivedAt),
    departedAt: normalizeIso(dto?.departedAt),
  };
}

export const employeeApi = {
  async getSchedule(): WrappedResponse<EmployeeScheduleResponse> {
    const { data } = await apiClient.get('/employee/schedule');
    return wrapData({
      message: data?.message ?? '',
      shifts: (data?.shifts ?? []).map(normalizeShift),
    });
  },

  async startShift(shiftId: string): WrappedResponse<ShiftStartResponse> {
    const { data } = await apiClient.post(`/employee/shifts/${shiftId}/start`, { shiftId });
    return wrapData({
      success: Boolean(data?.success),
      message: data?.message ?? '',
      shiftId: String(data?.shiftId ?? shiftId),
      status: normalizeShiftStatus(data?.status),
      actualStart: normalizeIso(data?.actualStart),
    });
  },

  async endShift(shiftId: string): WrappedResponse<ShiftEndResponse> {
    const { data } = await apiClient.post(`/employee/shifts/${shiftId}/end`);
    return wrapData({
      success: Boolean(data?.success),
      message: data?.message ?? '',
      shiftId: data?.shiftId != null ? String(data.shiftId) : shiftId,
      status: data?.status != null ? normalizeShiftStatus(data.status) : undefined,
      actualEnd: normalizeIso(data?.actualEnd),
    });
  },

  async updateLocation(shiftId: string, latitude: number, longitude: number): WrappedResponse<EmployeeShiftLocationResponse> {
    const { data } = await apiClient.post(`/employee/shifts/${shiftId}/location`, { latitude, longitude });
    return wrapData({
      success: Boolean(data?.success),
      message: data?.message ?? '',
      shiftId: String(data?.shiftId ?? shiftId),
      transportId: data?.transportId != null ? String(data.transportId) : null,
      latitude: normalizeCoordinate(data?.latitude) ?? latitude,
      longitude: normalizeCoordinate(data?.longitude) ?? longitude,
      updatedAt: normalizeIso(data?.updatedAt),
    });
  },

  async getStops(shiftId: string): WrappedResponse<EmployeeShiftStopsResponse> {
    const { data } = await apiClient.get(`/employee/shifts/${shiftId}/stops`);
    return wrapData({
      message: data?.message ?? '',
      shiftId: String(data?.shiftId ?? shiftId),
      stops: (data?.stops ?? []).map(normalizeStop),
    });
  },

  async arriveAtStop(shiftId: string, stopId: string): WrappedResponse<EmployeeStopActionResponse> {
    const { data } = await apiClient.post(`/employee/shifts/${shiftId}/stops/${stopId}/arrive`);
    return wrapData({
      message: data?.message ?? '',
      shiftId: String(data?.shiftId ?? shiftId),
      stopId: String(data?.stopId ?? stopId),
      status: normalizeStopStatus(data?.status),
      arrivedAt: normalizeIso(data?.arrivedAt),
      departedAt: normalizeIso(data?.departedAt),
    });
  },

  async departFromStop(shiftId: string, stopId: string): WrappedResponse<EmployeeStopActionResponse> {
    const { data } = await apiClient.post(`/employee/shifts/${shiftId}/stops/${stopId}/depart`);
    return wrapData({
      message: data?.message ?? '',
      shiftId: String(data?.shiftId ?? shiftId),
      stopId: String(data?.stopId ?? stopId),
      status: normalizeStopStatus(data?.status),
      arrivedAt: normalizeIso(data?.arrivedAt),
      departedAt: normalizeIso(data?.departedAt),
    });
  },

  async getProgress(shiftId: string): WrappedResponse<EmployeeShiftProgressResponse> {
    const { data } = await apiClient.get(`/employee/shifts/${shiftId}/progress`);
    return wrapData({
      message: data?.message ?? '',
      shiftId: String(data?.shiftId ?? shiftId),
      shiftStatus: normalizeShiftStatus(data?.shiftStatus),
      currentStop: data?.currentStop ? normalizeProgressStop(data.currentStop) : null,
      completedStops: (data?.completedStops ?? []).map(normalizeProgressStop),
      completedStopsCount: Number(data?.completedStopsCount ?? 0),
      totalStops: Number(data?.totalStops ?? 0),
      nextStop: data?.nextStop ? normalizeProgressStop(data.nextStop) : null,
      delayMinutes: Number(data?.delayMinutes ?? 0),
      currentLatitude: normalizeCoordinate(data?.currentLatitude),
      currentLongitude: normalizeCoordinate(data?.currentLongitude),
      currentLocationUpdatedAt: normalizeIso(data?.currentLocationUpdatedAt),
    });
  },
};
