import type { TaskStatus } from '../types';

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  todo:        { label: 'To Do',       color: 'bg-zinc-100 text-zinc-600' },
  blocked:     { label: 'Blocked',     color: 'bg-red-50 text-red-600' },
  in_progress: { label: 'In Progress', color: 'bg-blue-50 text-blue-700' },
  in_review:   { label: 'In Review',   color: 'bg-amber-50 text-amber-700' },
  done:        { label: 'Done',        color: 'bg-green-50 text-green-700' },
};
