import api from './axios';
import type { Notification } from '../types';

export const getNotifications = () =>
  api.get<Notification[]>('/notifications/').then((r) => r.data);

export const markAsRead = (id: number) =>
  api.patch<Notification>(`/notifications/${id}/`).then((r) => r.data);

export const markAllAsRead = () =>
  api.post('/notifications/mark-all-read/').then((r) => r.data);

export const broadcastNotification = (payload: {
  message: string;
  send_to_all: boolean;
  user_ids: number[];
}) => api.post<{ sent_to: number }>('/notifications/broadcast/', payload).then((r) => r.data);
