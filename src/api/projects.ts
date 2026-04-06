import api from './axios';
import type { Project, ProjectFile } from '../types';

export const getProjects = () =>
  api.get<Project[]>('/projects/').then((r) => r.data);

export const getProject = (id: number) =>
  api.get<Project>(`/projects/${id}/`).then((r) => r.data);

export const createProject = (data: { name: string; description: string; member_ids: number[] }) =>
  api.post<Project>('/projects/', data).then((r) => r.data);

export const updateProject = (id: number, data: { name?: string; description?: string; member_ids?: number[] }) =>
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

export const downloadProjectFile = async (projectId: number, fileId: number, fileName: string) => {
  const response = await api.get(`/projects/${projectId}/files/${fileId}/download/`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
