import api from './axios';
import type { User } from '../types';

export const getUsers = () =>
  api.get<User[]>('/users/').then((r) => r.data);

export const createUser = (data: { email: string; full_name: string; password: string; role_label: string; is_admin: boolean }) =>
  api.post<User>('/users/', data).then((r) => r.data);

export const updateUser = (id: number, data: { full_name?: string; role_label?: string; is_admin?: boolean; is_active?: boolean }) =>
  api.patch<User>(`/users/${id}/`, data).then((r) => r.data);

export const deactivateUser = (id: number) =>
  api.patch<User>(`/users/${id}/`, { is_active: false }).then((r) => r.data);

export const activateUser = (id: number) =>
  api.patch<User>(`/users/${id}/`, { is_active: true }).then((r) => r.data);

export const deleteUser = (id: number) =>
  api.delete(`/users/${id}/`).then((r) => r.data);
