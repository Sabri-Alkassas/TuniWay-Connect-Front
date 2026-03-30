import { client } from './client';
import type { User } from '../types/user';
import type { Ticket } from '../types/ticket';

export const adminApi = {
  getAllUsers: () => client.get<User[]>('/admin/users'),
  getUserById: (userId: string) => client.get<User>(`/admin/users/${userId}`),
  revokeTicket: (ticketId: string) => client.post<Ticket>(`/admin/tickets/${ticketId}/revoke`),
  validateTicket: (qrCode: string) => client.post<Ticket>('/admin/tickets/validate', { qrCode }),
};
