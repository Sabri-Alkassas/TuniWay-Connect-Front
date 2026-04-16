import type { ClientTicketDto } from '../types/client';

export interface TicketQrPayload {
  v: 1;
  ticketId: string;
  transportName: string;
  fromStop: string;
  toStop: string;
  purchasedAt: string;
  plannedDeparture: string;
  status: ClientTicketDto['status'];
  token: string;
}

function normalizeToken(ticket: ClientTicketDto) {
  return ticket.qrCode?.trim() || ticket.id;
}

export function buildTicketQrPayload(ticket: ClientTicketDto) {
  const payload: TicketQrPayload = {
    v: 1,
    ticketId: ticket.id,
    transportName: ticket.transportName,
    fromStop: ticket.fromStop,
    toStop: ticket.toStop,
    purchasedAt: ticket.purchasedAt,
    plannedDeparture: ticket.plannedDeparture,
    status: ticket.status,
    token: normalizeToken(ticket),
  };

  return JSON.stringify(payload);
}

export function parseTicketQrPayload(rawValue: string): TicketQrPayload | null {
  try {
    const parsed = JSON.parse(rawValue) as Partial<TicketQrPayload>;
    if (
      parsed?.v !== 1 ||
      typeof parsed.ticketId !== 'string' ||
      typeof parsed.token !== 'string'
    ) {
      return null;
    }

    return parsed as TicketQrPayload;
  } catch {
    return null;
  }
}
