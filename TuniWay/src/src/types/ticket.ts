export type TicketStatus = 'active' | 'used' | 'expired' | 'cancelled';

export interface Ticket {
  id: string;
  userId: string;
  stationFromId: string;
  stationFromName: string;
  stationToId: string;
  stationToName: string;
  price: number;
  status: TicketStatus;
  qrCode: string;
  purchasedAt: string;
  expiresAt: string;
  usedAt?: string | null;
}

export interface BuyTicketPayload {
  stationFromId: string;
  stationToId: string;
}
