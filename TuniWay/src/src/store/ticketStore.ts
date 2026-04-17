import { create } from 'zustand';
import type { Ticket } from '../types/ticket';

interface TicketState {
  tickets: Ticket[];
  activeTicket: Ticket | null;
  setTickets: (tickets: Ticket[]) => void;
  addTicket: (ticket: Ticket) => void;
  setActiveTicket: (ticket: Ticket | null) => void;
  clearTickets: () => void;
}

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  activeTicket: null,

  setTickets: (tickets) => {
    const active = tickets.find((t) => t.status === 'active') ?? null;
    set({ tickets, activeTicket: active });
  },

  addTicket: (ticket) => {
    const updated = [ticket, ...get().tickets];
    const active = updated.find((t) => t.status === 'active') ?? null;
    set({ tickets: updated, activeTicket: active });
  },

  setActiveTicket: (ticket) => set({ activeTicket: ticket }),
  clearTickets: () => set({ tickets: [], activeTicket: null }),
}));
