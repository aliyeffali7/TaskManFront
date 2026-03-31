import api from './axios';
import type { Project, ProjectFile } from '../types';

export const getProjects = () =>
  api.get<Project[]>('/projects/').then((r) => r.data);

export const getProject = (id: number) =>
  api.get<Project>(`/projects/${id}/`).then((r) => r.data);

export const createProject = (data: { name: string; description: string; member_ids: number[] }) =>
  api.post<Project>('/projects/', data).then((r) => r.data);

export const updateProject = (id: number, data: Partial<Project>) =>
  api.patch<Project>(`/projects/${id}/`, data).then((r) => r.data);

export const deleteProject = (id: number) =>
  api.delete(`/projects/${id}/`).then((r) => r.data);

export const getProjectFiles = (projectId: number) =>
  api.get<ProjectFile[]>(`/projects/${projectId}/files/`).then((r) => r.data);

export const uploadProjectFile = (projectId: number, file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post<ProjectFile>(`/projects/${projectId}/files/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

export const deleteProjectFile = (projectId: number, fileId: number) =>
  api.delete(`/projects/${projectId}/files/${fileId}/`).then((r) => r.data);
