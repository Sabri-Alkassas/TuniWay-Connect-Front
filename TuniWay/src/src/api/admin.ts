import { apiClient } from '../lib/apiClient';
import type {
  AdminDashboardResponse,
  StaffAccountResponse,
  RegisterStaffBody,
  UpdateStaffBody,
  UpdateStaffStatusBody,
  TransportResponse,
  CreateTransportBody,
  UpdateTransportBody,
  UpdateTransportStopsBody,
  UpdateTransportDeparturesBody,
  UpdateTransportZoneBody,
  AdminStopResponse,
  AdminShiftResponse,
  CreateShiftBody,
  UpdateShiftBody,
  ReassignTransportBody,
  PublishPlanningBody,
  ShiftStatus,
  TransportType,
} from '../types/admin';

function wrap<T>(data: T): { data: T } {
  return { data };
}

function splitFullName(fullName?: string) {
  const parts = String(fullName ?? '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

function normalizeStaff(dto: any): StaffAccountResponse {
  const name = splitFullName(dto?.fullName);
  return {
    id: String(dto?.id ?? ''),
    firstName: name.firstName,
    lastName: name.lastName,
    email: dto?.email ?? '',
    role: dto?.role ?? 'EMPLOYEE',
    status: dto?.status ?? 'INACTIVE',
    twoFactorEnabled: typeof dto?.twoFactorEnabled === 'boolean' ? dto.twoFactorEnabled : undefined,
    twoFactorSecret: dto?.twoFactorSecret ?? undefined,
    twoFactorSetupUri: dto?.twoFactorSetupUri ?? undefined,
    licenseNumber: dto?.license_number ?? undefined,
    employeeCode: dto?.employee_code ?? undefined,
    adminCode: dto?.admin_code ?? undefined,
    createdAt: dto?.createdAt ?? new Date().toISOString(),
  };
}

function normalizeTransport(dto: any): TransportResponse {
  const rawType = String(dto?.type ?? 'BUS').trim().toUpperCase();
  const type: TransportType =
    rawType === 'METRO' || rawType === 'TRAIN' ? rawType : 'BUS';

  return {
    id: String(dto?.id ?? dto?.code ?? ''),
    name: dto?.name ?? dto?.code ?? 'Transport',
    type: rawType === 'TRAM' ? 'TRAIN' : type,
    zone: dto?.zone ?? '',
    active: Boolean(dto?.active),
    stopsCount: dto?.stopsCount ?? 0,
    departuresCount: dto?.departuresCount ?? 0,
  };
}

function normalizeShift(dto: any): AdminShiftResponse {
  const normalizedStatus = String(dto?.status ?? 'SCHEDULED').trim().toUpperCase();
  const status: ShiftStatus =
    normalizedStatus === 'ACTIVE'
      ? 'IN_PROGRESS'
      : normalizedStatus === 'IN_PROGRESS' || normalizedStatus === 'COMPLETED' || normalizedStatus === 'CANCELLED'
        ? normalizedStatus
        : 'SCHEDULED';

  return {
    id: String(dto?.shiftId ?? dto?.id ?? ''),
    employeeId: String(dto?.employeeId ?? ''),
    employeeName: dto?.employeeName ?? 'Employee',
    transportId: String(dto?.transportId ?? ''),
    transportName: dto?.transportName ?? '',
    startTime: dto?.scheduleStart ?? dto?.startTime ?? new Date().toISOString(),
    endTime: dto?.scheduleEnd ?? dto?.endTime ?? new Date().toISOString(),
    status,
  };
}

function normalizeStop(dto: any): AdminStopResponse {
  return {
    id: String(dto?.stopId ?? dto?.id ?? ''),
    name: dto?.stopName ?? dto?.name ?? '',
    zone: dto?.zone ?? '',
    active: dto?.active !== false,
    lat: dto?.latitude != null ? Number(dto.latitude) : undefined,
    lng: dto?.longitude != null ? Number(dto.longitude) : undefined,
  };
}

function normalizeDeparture(dto: any) {
  const id = dto?.id != null ? String(dto.id).trim() : '';
  return {
    id: id || undefined,
    stopId: String(dto?.stopId ?? ''),
    dayOfWeek: dto?.dayOfWeek ?? 'Monday',
    time: dto?.departureTime ? String(dto.departureTime).slice(0, 5) : '06:00',
    active: dto?.active !== false,
    stopOrder: dto?.stopOrder != null ? Number(dto.stopOrder) : 0,
  };
}

export const adminDashboardApi = {
  async get() {
    const { data } = await apiClient.get('/admin/dashboard');
    return wrap<AdminDashboardResponse>({
      totalStaff: data?.totalStaffAccounts ?? 0,
      activeStaff: data?.activeStaffAccounts ?? 0,
      employeeCount: data?.totalEmployeeAccounts ?? 0,
      adminCount: data?.totalAdminAccounts ?? 0,
      totalTransports: data?.totalTransports ?? 0,
      activeTransports: data?.activeTransports ?? 0,
      shiftsPending: data?.scheduledShifts ?? 0,
      shiftsActive: data?.inProgressShifts ?? 0,
      shiftsCompleted: data?.completedShifts ?? 0,
      recentActivity: data?.recentActivity ?? [],
    });
  },
};

export const adminStaffApi = {
  async list() {
    const { data } = await apiClient.get('/admin/staff-accounts');
    return wrap((data ?? []).map(normalizeStaff));
  },

  async create(body: RegisterStaffBody) {
    const payload = {
      email: body.email,
      password_hash: body.password,
      fullName: `${body.firstName} ${body.lastName}`.trim(),
      role: body.role,
      license_number: body.licenseNumber,
      employee_code: body.employeeCode,
      admin_code: body.adminCode,
    };
    const { data } = await apiClient.post('/admin/staff-accounts', payload);
    return wrap(normalizeStaff(data));
  },

  async update(id: string, body: UpdateStaffBody) {
    const fullName = [body.firstName, body.lastName].filter(Boolean).join(' ').trim();
    const payload = {
      email: body.email,
      fullName: fullName || undefined,
      license_number: body.licenseNumber,
      employee_code: body.employeeCode,
      admin_code: body.adminCode,
    };
    const { data } = await apiClient.patch(`/admin/staff-accounts/${id}`, payload);
    return wrap(normalizeStaff(data));
  },

  async setStatus(id: string, body: UpdateStaffStatusBody) {
    const { data } = await apiClient.patch(`/admin/staff-accounts/${id}/status`, body);
    return wrap(normalizeStaff(data));
  },

  remove: (id: string) =>
    apiClient.delete(`/admin/staff-accounts/${id}`),
};

export const adminTransportApi = {
  async list() {
    const { data } = await apiClient.get('/admin/transports');
    return wrap((data ?? []).map(normalizeTransport));
  },

  async create(body: CreateTransportBody) {
    const payload = {
      code: `${body.type}-${Date.now()}`,
      name: body.name,
      routeName: body.name,
      transportType: body.type,
      start_point: body.name,
      end_point: body.name,
      operating_zone: body.zone,
      zone: body.zone,
      is_active: body.active,
      stops: [],
      departures: [],
    };
    const { data } = await apiClient.post('/admin/transports', payload);
    return wrap(normalizeTransport(data));
  },

  async update(id: string, body: UpdateTransportBody) {
    const payload = {
      name: body.name,
      transportType: body.type,
      zone: body.zone,
      is_active: body.active,
      routeName: body.name,
    };
    const { data } = await apiClient.patch(`/admin/transports/${id}`, payload);
    return wrap(normalizeTransport(data));
  },

  updateZone: (id: string, body: UpdateTransportZoneBody) =>
    apiClient.patch(`/admin/transports/${id}/zone`, body),

  updateStops: (id: string, body: UpdateTransportStopsBody) =>
    apiClient.patch(`/admin/transports/${id}/stops`, {
      stops: body.stops.map((stop) => ({
        stopId: stop.id,
        stopOrder: stop.stopOrder,
        active: stop.active,
      })),
    }),

  async listStops() {
    const { data } = await apiClient.get('/admin/stops');
    return wrap((data ?? []).map(normalizeStop));
  },

  async getStops(id: string) {
    const { data } = await apiClient.get(`/admin/transports/${id}/stops`);
    const stops = (data?.stops ?? []).map((item: any) => ({
      id: String(item?.stopId ?? item?.id ?? ''),
      stopOrder: Number(item?.stopOrder ?? 0),
      name: item?.stopName ?? item?.name ?? '',
      zone: item?.zone ?? '',
      active: item?.active !== false,
      lat: item?.latitude != null ? Number(item.latitude) : undefined,
      lng: item?.longitude != null ? Number(item.longitude) : undefined,
    }));
    return wrap(stops);
  },

  async getDepartures(id: string) {
    const { data } = await apiClient.get(`/admin/transports/${id}/departures`);
    return wrap((data?.departures ?? []).map(normalizeDeparture));
  },

  updateDepartures: (id: string, body: UpdateTransportDeparturesBody) =>
    apiClient.patch(`/admin/transports/${id}/departures`, {
      departures: body.departures.map((departure) => ({
        stopId: departure.stopId,
        stopOrder: departure.stopOrder,
        dayOfWeek: departure.dayOfWeek,
        departureTime: departure.time,
        active: departure.active,
      })),
    }),

  updateRoute: (id: string, body: object) =>
    apiClient.patch(`/admin/transports/${id}/route`, body),
};

export const adminShiftApi = {
  async list() {
    const { data } = await apiClient.get('/admin/shifts');
    return wrap((data ?? []).map(normalizeShift));
  },

  async create(body: CreateShiftBody) {
    const { data } = await apiClient.post('/admin/shifts', body);
    return wrap(normalizeShift(data));
  },

  async update(id: string, body: UpdateShiftBody) {
    const payload = {
      newStart: body.startTime,
      newEnd: body.endTime,
      transportId: body.transportId,
    };
    const { data } = await apiClient.patch(`/admin/shifts/${id}`, payload);
    return wrap(normalizeShift(data));
  },

  async reassignTransport(id: string, body: ReassignTransportBody) {
    const { data } = await apiClient.patch(`/admin/shifts/${id}/reassign-transport`, {
      newTransportId: body.transportId,
    });
    return wrap(normalizeShift(data));
  },
};

export const adminPlanningApi = {
  publish: (body: PublishPlanningBody) =>
    apiClient.post('/admin/planning/publish', {
      changes: body.shiftIds.map((shiftId) => ({ shiftId })),
    }),
};
