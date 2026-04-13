import axios, { isAxiosError } from 'axios';
import { getApiBaseUrl } from '../config/apiBaseUrl';
import { useAuthStore } from '../store/authStore';
import { useTicketStore } from '../store/ticketStore';
import { useLocationStore } from '../store/locationStore';
import type {
  ClientDashboardResponse,
  ClientAccountResponse,
  ClientTicketDto,
  ClientTicketHistoryResponse,
  ClientTicketProductDto,
  ClientTransportDetailsResponse,
  ClientTransportStopDto,
  ClientTransportDepartureDto,
  CreateTicketRequest,
  SearchTransportRequest,
  SearchTransportResponse,
  NearbyTransportResponse,
  UpdateClientAccountRequest,
} from '../types/client';

const BASE_URL = getApiBaseUrl();
const CLIENT_API_PREFIX = '/api/v1/client';
let lastPurchasedTicket: ClientTicketDto | null = null;

export const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await useAuthStore.getState().clearAuth();
      useTicketStore.getState().clearTickets();
      useLocationStore.getState().clearLocation();
    }
    return Promise.reject(error);
  },
);

export interface ApiError {
  message: string;
  status: number;
}

type WrappedResponse<T> = Promise<{ data: { data: T } }>;

function wrapData<T>(data: T): { data: { data: T } } {
  return { data: { data } };
}

function normalizeTransport(dto: any): ClientTransportDetailsResponse {
  return {
    id: String(dto?.id ?? ''),
    name: dto?.name ?? dto?.routeName ?? '',
    type: dto?.type ?? 'BUS',
    zone: dto?.zone ?? dto?.operatingZone ?? '',
    active: Boolean(dto?.active),
    description: [dto?.routeName, dto?.startPoint, dto?.endPoint].filter(Boolean).join(' · ') || undefined,
    stops: [],
    departures: [],
  };
}

function normalizeTransportListItem(dto: any) {
  return {
    id: String(dto?.id ?? ''),
    name: dto?.name ?? dto?.routeName ?? '',
    type: dto?.type ?? 'BUS',
    zone: dto?.zone ?? dto?.operatingZone ?? '',
    active: Boolean(dto?.active),
    stopsCount: dto?.stopCount ?? 0,
    departuresCount: dto?.departureCount ?? 0,
  };
}

function normalizeStop(dto: any): ClientTransportStopDto {
  return {
    id: String(dto?.stopId ?? dto?.id ?? ''),
    name: dto?.stopName ?? dto?.name ?? '',
    stopOrder: dto?.stopOrder ?? 0,
    zone: dto?.zone ?? '',
    active: Boolean(dto?.active),
    latitude: dto?.latitude != null ? Number(dto.latitude) : undefined,
    longitude: dto?.longitude != null ? Number(dto.longitude) : undefined,
  };
}

function normalizeDeparture(dto: any): ClientTransportDepartureDto {
  return {
    id: String(dto?.stopId ?? dto?.id ?? `${dto?.stopName ?? 'dep'}-${dto?.departureTime ?? ''}`),
    departureTime: dto?.departureTime ? String(dto.departureTime) : '--:--',
    expectedArrivalTime: undefined,
    arrivalTime: undefined,
    available: dto?.active ?? true,
    direction: dto?.stopName ?? undefined,
    status: dto?.active === false ? 'CANCELLED' : 'ON_TIME',
  };
}

function normalizeTicket(dto: any): ClientTicketDto {
  return {
    id: String(dto?.ticketId ?? dto?.id ?? ''),
    productName: dto?.productName ?? '',
    transportName: dto?.transportName ?? '',
    fromStop: dto?.fromStopName ?? dto?.fromStop ?? '',
    toStop: dto?.toStopName ?? dto?.toStop ?? '',
    purchasedAt: dto?.purchaseTime ?? dto?.purchasedAt ?? new Date().toISOString(),
    plannedDeparture: dto?.validUntil ?? dto?.plannedDeparture ?? dto?.purchaseTime ?? new Date().toISOString(),
    price: Number(dto?.price ?? 0),
    currency: dto?.payment?.currency ?? 'TND',
    status: dto?.status ?? 'VALID',
    qrCode: dto?.payment?.providerReference ?? dto?.ticketId ?? dto?.id,
  };
}

function normalizeProduct(dto: any): ClientTicketProductDto {
  const durationMinutes = Number(dto?.validDurationMinutes ?? 0);
  return {
    id: String(dto?.id ?? ''),
    name: dto?.name ?? '',
    description: dto?.description ?? '',
    price: Number(dto?.price ?? 0),
    currency: 'TND',
    validityDays: durationMinutes >= 1440 ? Math.floor(durationMinutes / 1440) : 0,
    validityHours: durationMinutes > 0 && durationMinutes < 1440 ? Math.max(1, Math.floor(durationMinutes / 60)) : undefined,
  };
}

function normalizeAccount(dto: any): ClientAccountResponse {
  return {
    id: String(dto?.id ?? ''),
    email: dto?.email ?? '',
    username: dto?.username ?? '',
    firstName: dto?.firstName ?? '',
    lastName: dto?.lastName ?? '',
    phone: dto?.phone ?? '',
    role: dto?.role ?? '',
    status: dto?.status ?? '',
    birthDate: dto?.birthDate ? String(dto.birthDate).slice(0, 10) : undefined,
  };
}

function normalizeDashboard(dto: any): ClientDashboardResponse {
  const displayName = String(dto?.displayName ?? '').trim();
  const [firstName = '', ...rest] = displayName.split(/\s+/).filter(Boolean);
  return {
    firstName,
    lastName: rest.join(' '),
    accountStatus: dto?.status ?? '',
    totalTrips: 0,
    activeTickets: 0,
    missingFields: dto?.missingProfileFields ?? [],
    recentTickets: [],
  };
}

function normalizeSort(sortBy: string): string {
  return sortBy.replace('purchasedAt', 'purchaseTime').replace('plannedDeparture', 'validUntil');
}

function sanitizeApiMessage(message: string | undefined, status: number): string {
  const normalized = message?.trim();
  if (!normalized) {
    return status >= 500 ? 'The server is temporarily unavailable. Please try again.' : 'An unexpected error occurred';
  }

  const lower = normalized.toLowerCase();
  if (
    lower.includes('jdbc exception') ||
    lower.includes('sql [') ||
    lower.includes('operator does not exist') ||
    lower.includes('sqlstate')
  ) {
    return 'Search is temporarily unavailable. Please try again in a moment.';
  }

  return normalized;
}

export function parseApiError(error: unknown): ApiError {
  if (isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    return {
      message: sanitizeApiMessage(error.response?.data?.message ?? error.message, status),
      status,
    };
  }
  return { message: 'An unexpected error occurred', status: 0 };
}

export const clientDashboardApi = {
  async get(): WrappedResponse<ClientDashboardResponse> {
    const { data } = await client.get(`${CLIENT_API_PREFIX}/dashboard`);
    return wrapData(normalizeDashboard(data));
  },
};

export const clientAccountApi = {
  async get(): WrappedResponse<ClientAccountResponse> {
    const { data } = await client.get(`${CLIENT_API_PREFIX}/account`);
    return wrapData(normalizeAccount(data));
  },
  async update(data: UpdateClientAccountRequest): WrappedResponse<ClientAccountResponse> {
    const body = {
      ...data,
      birthDate: data.birthDate ? `${data.birthDate}T00:00:00Z` : undefined,
    };
    const response = await client.patch(`${CLIENT_API_PREFIX}/account`, body);
    return wrapData(normalizeAccount(response.data));
  },
};

export const clientTicketApi = {
  async list(page = 0, size = 15, sortBy = 'purchasedAt,desc'): WrappedResponse<ClientTicketHistoryResponse> {
    const { data } = await client.get(
      `${CLIENT_API_PREFIX}/tickets/history?page=${page}&size=${size}&sort=${encodeURIComponent(normalizeSort(sortBy))}`
    );
    return wrapData({
      content: (data?.tickets ?? []).map(normalizeTicket),
      totalElements: data?.totalItems ?? 0,
      totalPages: data?.totalPages ?? 0,
      currentPage: data?.page ?? page,
    });
  },
  async get(ticketId: string): WrappedResponse<ClientTicketDto> {
    if (lastPurchasedTicket?.id === ticketId) {
      return wrapData(lastPurchasedTicket);
    }

    const history = await this.list(0, 100, 'purchaseTime,desc');
    const ticket = history.data.data.content.find((item) => item.id === ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    return wrapData(ticket);
  },
  async create(payload: CreateTicketRequest): WrappedResponse<ClientTicketDto> {
    return this.purchase(payload);
  },
  async getProducts(params: { transportId: string; fromStopId: string; toStopId: string }): WrappedResponse<ClientTicketProductDto[]> {
    const q = new URLSearchParams();
    q.append('transportId', params.transportId);
    q.append('fromStopId', params.fromStopId);
    q.append('toStopId', params.toStopId);
    const { data } = await client.get(`${CLIENT_API_PREFIX}/tickets/products?${q.toString()}`);
    return wrapData((data?.products ?? []).map(normalizeProduct));
  },
  async purchase(payload: CreateTicketRequest): WrappedResponse<ClientTicketDto> {
    const body = {
      productId: payload.productId,
      transportId: payload.transportId,
      fromStopId: payload.fromStopId,
      toStopId: payload.toStopId,
      plannedDepartureTime: payload.plannedDepartureTime
        ? new Date(payload.plannedDepartureTime).toISOString().slice(11, 19)
        : undefined,
      provider: payload.provider,
      providerReference: payload.providerReference,
      paymentMethod: payload.paymentMethod,
    };
    const { data } = await client.post(`${CLIENT_API_PREFIX}/tickets/purchase`, body);
    const ticket = normalizeTicket(data?.ticket);
    lastPurchasedTicket = ticket;
    return wrapData(ticket);
  },
};

export const clientTransportApi = {
  async get(transportId: string): WrappedResponse<ClientTransportDetailsResponse> {
    const { data } = await client.get(`${CLIENT_API_PREFIX}/transports/${transportId}`);
    return wrapData(normalizeTransport(data?.transport));
  },
  async getStops(transportId: string): WrappedResponse<{ stops: ClientTransportStopDto[] }> {
    const { data } = await client.get(`${CLIENT_API_PREFIX}/transports/${transportId}/stops`);
    return wrapData({ stops: (data?.stops ?? []).map(normalizeStop) });
  },
  async getDepartures(transportId: string, date: string): WrappedResponse<{ departures: ClientTransportDepartureDto[] }> {
    const { data } = await client.get(`${CLIENT_API_PREFIX}/transports/${transportId}/departures?date=${date}`);
    return wrapData({ departures: (data?.departures ?? []).map(normalizeDeparture) });
  },
  async search(params: SearchTransportRequest): WrappedResponse<SearchTransportResponse> {
    const q = new URLSearchParams();
    if (params.query) q.append('q', params.query);
    if (params.zone) q.append('zone', params.zone);
    if (params.type) q.append('type', params.type);
    if (params.active !== undefined) q.append('active', String(params.active));
    q.append('page', String(params.page));
    q.append('size', String(params.size));
    if (params.sort) q.append('sort', params.sort);
    const { data } = await client.get(`${CLIENT_API_PREFIX}/transports/search?${q.toString()}`);
    return wrapData({
      content: (data?.transports ?? []).map(normalizeTransportListItem),
      totalElements: data?.totalItems ?? 0,
      totalPages: data?.totalPages ?? 0,
      currentPage: data?.page ?? params.page,
    });
  },
  async nearby(params: { latitude: number; longitude: number; radiusMeters: number; type?: string; active?: boolean; page?: number; size?: number }): WrappedResponse<NearbyTransportResponse> {
    const q = new URLSearchParams();
    q.append('lat', String(params.latitude));
    q.append('lng', String(params.longitude));
    q.append('radiusMeters', String(params.radiusMeters));
    const { data } = await client.get(`${CLIENT_API_PREFIX}/transports/nearby?${q.toString()}`);
    const content = (data?.transports ?? [])
      .map((item: any) => ({
        transport: normalizeTransportListItem(item?.transport),
        distanceMeters: Number(item?.distanceMeters ?? 0),
        nearestStopName: item?.nearestStop?.stopName ?? '',
        matchingStopCount: item?.matchingStopCount ?? 0,
      }))
      .filter((item: any) => (!params.type || item.transport.type === params.type) && (!params.active || item.transport.active));
    return wrapData({
      content,
      totalElements: content.length,
      totalPages: content.length > 0 ? 1 : 0,
      currentPage: 0,
    });
  },
};
