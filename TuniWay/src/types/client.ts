// Dashboard & Account
export interface ClientDashboardResponse {
  firstName: string;
  lastName: string;
  accountStatus: string;
  totalTrips: number;
  activeTickets: number;
  missingFields: string[];
  recentTickets: ClientTicketDto[];
}

export interface ClientAccountResponse {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  status: string;
  birthDate?: string;
}

export interface UpdateClientAccountRequest {
  firstName: string;
  lastName: string;
  phone?: string;
  birthDate?: string;
}

// Tickets
export interface ClientTicketDto {
  id: string;
  productName: string;
  transportName: string;
  fromStop: string;
  toStop: string;
  purchasedAt: string;
  plannedDeparture: string;
  price: number;
  currency: string;
  status: 'VALID' | 'USED' | 'EXPIRED' | 'CANCELLED';
  qrCode?: string;
}

export interface ClientTicketProductDto {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  validityDays: number;
  validityHours?: number;
}

export interface CreateTicketRequest {
  transportId: string;
  fromStopId: string;
  toStopId: string;
  productId: string;
  paymentMethod: PaymentMethod;
  quantity?: number;
  plannedDepartureTime?: string;
  provider?: string;
  providerReference?: string;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE';

// Transports
export interface ClientTransportDto {
  id: string;
  name: string;
  type: TransportType;
  zone: string;
  active: boolean;
  stopsCount?: number;
  departuresCount?: number;
}

export interface ClientNearbyTransportDto {
  transport: ClientTransportDto;
  distanceMeters: number;
  nearestStopName: string;
  matchingStopCount: number;
  markerLatitude?: number;
  markerLongitude?: number;
  locationSource?: 'LIVE' | 'STOP';
  locationUpdatedAt?: string;
}

export interface ClientTransportDetailsResponse {
  id: string;
  name: string;
  type: TransportType;
  zone: string;
  active: boolean;
  description?: string;
  stops: ClientTransportStopDto[];
  departures: ClientTransportDepartureDto[];
}

export interface ClientTransportStopDto {
  id: string;
  name: string;
  stopOrder: number;
  zone: string;
  active: boolean;
  latitude?: number;
  longitude?: number;
}

export interface ClientTransportDepartureDto {
  id: string;
  stopId?: string;
  stopOrder?: number;
  departureTime: string;
  expectedArrivalTime?: string;
  arrivalTime?: string;
  available?: boolean;
  direction?: string;
  status?: 'ON_TIME' | 'DELAYED' | 'CANCELLED';
}

export type TransportType = 'BUS' | 'TRAIN' | 'METRO';

// Search
export interface SearchTransportRequest {
  query?: string;
  zone?: string;
  type?: TransportType;
  active?: boolean;
  page: number;
  size: number;
  sort?: string;
}

export interface SearchTransportResponse {
  content: ClientTransportDto[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
}

// Nearby transports
export interface NearbyTransportRequest {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  active?: boolean;
  type?: TransportType;
  page: number;
  size: number;
}

export interface NearbyTransportResponse {
  content: ClientNearbyTransportDto[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
}

export interface ClientTicketHistoryResponse {
  content: ClientTicketDto[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
}
