export type TicketType   = 'SINGLE' | 'RETURN' | 'MONTHLY';
export type TicketStatus = 'ACTIVE' | 'USED' | 'EXPIRED';

export interface Ticket {
  id: string;
  stationName: string;
  type: TicketType;
  status: TicketStatus;
  quantity: number;
  unitPrice: number;
  totalPaid: number;
  validUntil: string;
  qrCode: string;
  purchasedAt: string;
}