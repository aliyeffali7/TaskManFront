import api from './axios';
import type { Ticket, TicketStatus } from '../types';

export const getTickets = () =>
  api.get<Ticket[]>('/tickets/').then((r) => r.data);

export const getTicket = (id: number) =>
  api.get<Ticket>(`/tickets/${id}/`).then((r) => r.data);

export const createTicket = (data: Partial<Ticket>) =>
  api.post<Ticket>('/tickets/', data).then((r) => r.data);

export const updateTicket = (id: number, data: Partial<Ticket>) =>
  api.patch<Ticket>(`/tickets/${id}/`, data).then((r) => r.data);

export const updateTicketStatus = (id: number, status: TicketStatus, admin_note?: string) =>
  api.patch<Ticket>(`/tickets/${id}/`, { status, ...(admin_note !== undefined && { admin_note }) }).then((r) => r.data);
