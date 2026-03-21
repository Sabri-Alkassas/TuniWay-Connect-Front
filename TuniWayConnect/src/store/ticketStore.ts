import { create } from 'zustand';
import { Ticket } from '../types/ticket';

interface TicketState {
  tickets: Ticket[];
  activeTicket: Ticket | null;
  setTickets: (tickets: Ticket[]) => void;
  setActiveTicket: (ticket: Ticket | null) => void;
}

export const useTicketStore = create<TicketState>((set) => ({
  tickets: [],
  activeTicket: null,
  setTickets: (tickets) => set({ tickets }),
  setActiveTicket: (ticket) => set({ activeTicket: ticket }),
}));