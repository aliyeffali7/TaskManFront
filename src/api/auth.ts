import api from './axios';
import type { User } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  user: User;
}

export const login = (data: LoginPayload) =>
  api.post<LoginResponse>('/auth/login/', data).then((r) => r.data);

export const logout = () =>
  api.post('/auth/logout/').then((r) => r.data);

export const getMe = () =>
  api.get<User>('/auth/me/').then((r) => r.data);
