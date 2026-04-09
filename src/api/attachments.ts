import api from './axios';
import type { Attachment } from '../types';

export const getTaskAttachments = (taskId: number) =>
  api.get<Attachment[]>(`/tasks/${taskId}/attachments/`).then((r) => r.data);

export const uploadTaskAttachment = (taskId: number, file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post<Attachment>(`/tasks/${taskId}/attachments/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

export const deleteTaskAttachment = (taskId: number, attachmentId: number) =>
  api.delete(`/tasks/${taskId}/attachments/${attachmentId}/`).then((r) => r.data);

export const downloadTaskAttachment = async (fileUrl: string, fileName: string) => {
  const response = await api.get(fileUrl, { responseType: 'blob', baseURL: '' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
