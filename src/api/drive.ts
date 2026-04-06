import api from './axios';
import type { DriveFolder, DriveFile, DriveContents, DriveFolderContents } from '../types';

export const getDriveRoot = () =>
  api.get<DriveContents>('/drive/').then((r) => r.data);

export const getDriveFolder = (id: number) =>
  api.get<DriveFolderContents>(`/drive/folders/${id}/`).then((r) => r.data);

export const createDriveFolder = (data: { name: string; parent?: number | null }) =>
  api.post<DriveFolder>('/drive/folders/', data).then((r) => r.data);

export const deleteDriveFolder = (id: number) =>
  api.delete(`/drive/folders/${id}/`).then((r) => r.data);

export const uploadDriveFile = (file: File, folderId: number | null) => {
  const form = new FormData();
  form.append('file', file);
  if (folderId != null) form.append('folder', String(folderId));
  return api.post<DriveFile>('/drive/files/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

export const deleteDriveFile = (id: number) =>
  api.delete(`/drive/files/${id}/`).then((r) => r.data);

export const downloadDriveFile = async (fileId: number, fileName: string) => {
  const response = await api.get(`/drive/files/${fileId}/download/`, {
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
