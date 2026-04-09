import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { toast } from 'sonner';
import { getTask, updateTaskStatus, deleteTask } from '../api/tasks';
import { STATUS_CONFIG } from '../utils/statusConfig';
import { useAuthStore } from '../store/authStore';
import SlideOver from '../components/ui/SlideOver';
import EditTaskForm from '../components/tasks/EditTaskForm';
import CommentSection from '../components/comments/CommentSection';
import SubTaskSection from '../components/tasks/SubTaskSection';
import TaskAttachments from '../components/tasks/TaskAttachments';
import type { TaskStatus } from '../types';

const STATUS_OPTIONS: TaskStatus[] = ['todo', 'blocked', 'in_progress', 'in_review', 'done'];

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-zinc-100 text-zinc-600',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-red-50 text-red-600',
};

const MINI_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function MiniCalendar({ dueDate }: { dueDate: string }) {
  const due = new Date(dueDate + 'T00:00:00');
  const year = due.getFullYear();
  const month = due.getMonth();
  const dueDay = due.getDate();

  const first = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const startOffset = (first.getDay() + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const todayDay = today.getDate();
  const isSameMonthAsToday = today.getFullYear() === year && today.getMonth() === month;

  return (
    <div className="w-full">
      <p className="text-xs font-semibold text-zinc-500 text-center mb-2">
        {format(due, 'MMMM yyyy')}
      </p>
      <div className="grid grid-cols-7 mb-1">
        {MINI_DAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-zinc-400 py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (day === null) return <div key={idx} />;
          const isDue = day === dueDay;
          const isTodayCell = isSameMonthAsToday && day === todayDay;
          return (
            <div
              key={idx}
              className={`text-center text-[11px] py-1 mx-0.5 rounded font-medium ${
                isDue
                  ? 'bg-blue-600 text-white font-bold'
                  : isTodayCell
                  ? 'ring-1 ring-blue-400 text-blue-600 bg-blue-50'
                  : 'text-zinc-500'
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const taskId = Number(id);
  const isAdmin = useAuthStore((s) => s.user?.is_admin);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => getTask(taskId),
  });

  const { mutate: changeStatus } = useMutation({
    mutationFn: (status: TaskStatus) => updateTaskStatus(taskId, status),
    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: ['task', taskId] });
      const prev = queryClient.getQueryData(['task', taskId]);
      queryClient.setQueryData(['task', taskId], (old: typeof task) => old ? { ...old, status } : old);
      return { prev };
    },
    onError: (_err, _status, ctx) => {
      queryClient.setQueryData(['task', taskId], ctx?.prev);
      toast.error('Failed to update status');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['task', taskId] }),
  });

  const { mutate: remove, isPending: isDeleting } = useMutation({
    mutationFn: () => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
      navigate(-1);
    },
    onError: () => toast.error('Failed to delete task'),
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl space-y-4">
        <div className="h-8 w-1/2 bg-zinc-200 rounded animate-pulse" />
        <div className="h-32 bg-zinc-200 rounded-lg animate-pulse" />
        <div className="h-48 bg-zinc-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <p className="text-zinc-400 text-sm">Task not found.</p>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[task.status];

  return (
    <>
      <div className="p-6 max-w-3xl space-y-4">
        <div className="bg-white rounded-lg border border-zinc-300 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-zinc-800 leading-snug">{task.title}</h2>
            {isAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setEditOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-300 text-zinc-500 text-xs font-medium rounded-lg hover:bg-zinc-50 hover:text-zinc-800 transition-colors"
                >
                  <Pencil size={12} />
                  Edit
                </button>
                {confirmDelete ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => remove()}
                      disabled={isDeleting}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
                    >
                      {isDeleting ? 'Deleting…' : 'Confirm delete'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1.5 border border-zinc-300 text-zinc-500 text-xs font-medium rounded-lg hover:bg-zinc-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-400 text-xs font-medium rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>

          {task.description && (
            <p className="text-sm text-zinc-600 mb-5 whitespace-pre-wrap leading-relaxed">{task.description}</p>
          )}

          <div className="flex items-center gap-3 mb-5">
            <span className="text-xs font-medium text-zinc-400">Status</span>
            <select
              value={task.status}
              onChange={(e) => changeStatus(e.target.value as TaskStatus)}
              className={`text-xs font-medium rounded-full px-3 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusConfig.color}`}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="bg-white text-zinc-900">{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-zinc-200 pt-5 flex gap-6">
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Assigned to</p>
                  {task.assigned_to.length === 0 ? (
                    <p className="font-medium text-zinc-400">—</p>
                  ) : (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {task.assigned_to.map((u) => (
                        <span key={u.id} className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                          {u.full_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Due date</p>
                  <p className="font-medium text-zinc-700">
                    {task.due_date ? format(new Date(task.due_date + 'T00:00:00'), 'MMM d, yyyy') : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Priority</p>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${PRIORITY_BADGE[task.priority]}`}>
                    {task.priority}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Created by</p>
                  <p className="font-medium text-zinc-700">{task.created_by?.full_name ?? '—'}</p>
                </div>
              </div>

              {task.prerequisites.length > 0 && (
                <div className="border-t border-zinc-200 pt-4">
                  <p className="text-xs font-medium text-zinc-400 mb-2">Blocked by</p>
                  <div className="flex flex-wrap gap-2">
                    {task.prerequisites.map((preId) => (
                      <Link
                        key={preId}
                        to={`/tasks/${preId}`}
                        className="inline-flex items-center px-2.5 py-1 rounded border border-zinc-300 text-xs text-zinc-600 hover:bg-zinc-50 hover:border-zinc-400 transition-colors"
                      >
                        Task #{preId}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {task.due_date && (
              <div className="w-44 shrink-0 border-l border-zinc-200 pl-6">
                <MiniCalendar dueDate={task.due_date} />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-zinc-300 shadow-sm p-6">
          <SubTaskSection task={task} isAdmin={!!isAdmin} />
        </div>

        <div className="bg-white rounded-lg border border-zinc-300 shadow-sm p-6">
          <TaskAttachments taskId={taskId} isAdmin={!!isAdmin} />
        </div>

        <div className="bg-white rounded-lg border border-zinc-300 shadow-sm p-6">
          <CommentSection taskId={taskId} />
        </div>
      </div>

      <SlideOver open={editOpen} onClose={() => setEditOpen(false)} title="Edit Task">
        <EditTaskForm task={task} onClose={() => setEditOpen(false)} />
      </SlideOver>
    </>
  );
}
