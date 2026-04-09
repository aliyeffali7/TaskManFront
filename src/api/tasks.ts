import api from './axios';
import type { Task, TaskStatus, TaskPriority } from '../types';

export interface TaskCreatePayload {
  title: string;
  description?: string;
  assigned_to_ids?: number[];
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  prerequisite_ids?: number[];
  order?: number;
}

export interface TaskUpdatePayload {
  title?: string;
  description?: string;
  assigned_to_ids?: number[];
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  prerequisite_ids?: number[];
  order?: number;
}

export const getTasks = (projectId: number) =>
  api.get<Task[]>(`/projects/${projectId}/tasks/`).then((r) => r.data);

export const getMyTasks = () =>
  api.get<Task[]>('/tasks/my/').then((r) => r.data);

export const getTask = (id: number) =>
  api.get<Task>(`/tasks/${id}/`).then((r) => r.data);

export const createTask = (projectId: number, data: TaskCreatePayload) =>
  api.post<Task>(`/projects/${projectId}/tasks/`, data).then((r) => r.data);

export const updateTask = (id: number, data: TaskUpdatePayload) =>
  api.patch<Task>(`/tasks/${id}/`, data).then((r) => r.data);

export const updateTaskStatus = (id: number, status: TaskStatus) =>
  api.patch<Task>(`/tasks/${id}/`, { status }).then((r) => r.data);

export const deleteTask = (id: number) =>
  api.delete(`/tasks/${id}/`).then((r) => r.data);

export const getCalendarTasks = (year: number, month: number) => {
  const m = String(month + 1).padStart(2, '0');
  const lastDay = new Date(year, month + 1, 0).getDate();
  const start = `${year}-${m}-01`;
  const end = `${year}-${m}-${String(lastDay).padStart(2, '0')}`;
  return api.get<Task[]>('/tasks/', { params: { due_date_after: start, due_date_before: end } }).then((r) => r.data);
};
