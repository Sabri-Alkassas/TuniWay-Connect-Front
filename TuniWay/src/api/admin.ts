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
  AdminShiftResponse,
  UpdateShiftBody,
  ReassignTransportBody,
  PublishPlanningBody,
} from '../types/admin';



export const adminDashboardApi = {
  get: () =>
    apiClient.get<AdminDashboardResponse>('/admin/dashboard'),
};

export const adminStaffApi = {
  list: () =>
    apiClient.get<StaffAccountResponse[]>('/admin/staff-accounts'),

  create: (body: RegisterStaffBody) =>
    apiClient.post<StaffAccountResponse>('/admin/staff-accounts', body),

  update: (id: string, body: UpdateStaffBody) =>
    apiClient.patch<StaffAccountResponse>(`/admin/staff-accounts/${id}`, body),

  setStatus: (id: string, body: UpdateStaffStatusBody) =>
    apiClient.patch<void>(`/admin/staff-accounts/${id}/status`, body),

  remove: (id: string) =>
    apiClient.delete<void>(`/admin/staff-accounts/${id}`),
};


export const adminTransportApi = {
  list: () =>
    apiClient.get<TransportResponse[]>('/admin/transports'),

  create: (body: CreateTransportBody) =>
    apiClient.post<TransportResponse>('/admin/transports', body),

  update: (id: string, body: UpdateTransportBody) =>
    apiClient.patch<TransportResponse>(`/admin/transports/${id}`, body),

  updateZone: (id: string, body: UpdateTransportZoneBody) =>
    apiClient.patch<void>(`/admin/transports/${id}/zone`, body),

  updateStops: (id: string, body: UpdateTransportStopsBody) =>
    apiClient.patch<void>(`/admin/transports/${id}/stops`, body),

  updateDepartures: (id: string, body: UpdateTransportDeparturesBody) =>
    apiClient.patch<void>(`/admin/transports/${id}/departures`, body),

  updateRoute: (id: string, body: object) =>
    apiClient.patch<void>(`/admin/transports/${id}/route`, body),
};


export const adminShiftApi = {
  list: () =>
    apiClient.get<AdminShiftResponse[]>('/admin/shifts'),

  update: (id: string, body: UpdateShiftBody) =>
    apiClient.patch<AdminShiftResponse>(`/admin/shifts/${id}`, body),

  reassignTransport: (id: string, body: ReassignTransportBody) =>
    apiClient.patch<void>(`/admin/shifts/${id}/reassign-transport`, body),
};

export const adminPlanningApi = {
  publish: (body: PublishPlanningBody) =>
    apiClient.post<void>('/admin/planning/publish', body),
};