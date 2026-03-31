import api from './axios';
import type { Comment } from '../types';

export const getComments = (taskId: number) =>
  api.get<Comment[]>(`/tasks/${taskId}/comments/`).then((r) => r.data);

export const createComment = (taskId: number, body: string) =>
  api.post<Comment>(`/tasks/${taskId}/comments/`, { body }).then((r) => r.data);

export const updateComment = (id: number, body: string) =>
  api.patch<Comment>(`/comments/${id}/`, { body }).then((r) => r.data);

export const deleteComment = (id: number) =>
  api.delete(`/comments/${id}/`).then((r) => r.data);

export const uploadAttachment = (commentId: number, file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api
    .post(`/comments/${commentId}/attachments/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};
