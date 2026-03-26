import { client } from './client';
import type { Ticket, BuyTicketPayload } from '../types/ticket';

export const ticketsApi = {
  buy: (payload: BuyTicketPayload) =>
    client.post<Ticket>('/tickets/buy', payload),

  getMyTickets: () =>
    client.get<Ticket[]>('/tickets/my'),

  getById: (ticketId: string) =>
    client.get<Ticket>(`/tickets/${ticketId}`),

  validate: (qrCode: string) =>
    client.post<Ticket>('/tickets/validate', { qrCode }),
};
