import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getProject } from '../../api/projects';
import { createSubTask, updateSubTask, deleteSubTask } from '../../api/tasks';
import { STATUS_CONFIG } from '../../utils/statusConfig';
import type { SubTask, Task, TaskStatus } from '../../types';

const STATUS_OPTIONS: TaskStatus[] = ['todo', 'blocked', 'in_progress', 'in_review', 'done'];

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-zinc-100 text-zinc-600',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-red-50 text-red-600',
};

interface SubTaskRowProps {
  sub: SubTask;
  taskId: number;
  isAdmin: boolean;
}

function SubTaskRow({ sub, taskId, isAdmin }: SubTaskRowProps) {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { mutate: changeStatus } = useMutation({
    mutationFn: (status: TaskStatus) => updateSubTask(taskId, sub.id, { status }),
    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: ['task', taskId] });
      const prev = queryClient.getQueryData(['task', taskId]);
      queryClient.setQueryData(['task', taskId], (old: Task | undefined) => {
        if (!old) return old;
        return {
          ...old,
          subtasks: old.subtasks.map((s) => s.id === sub.id ? { ...s, status } : s),
        };
      });
      return { prev };
    },
    onError: (_err, _s, ctx) => {
      queryClient.setQueryData(['task', taskId], ctx?.prev);
      toast.error('Failed to update status');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['task', taskId] }),
  });

  const { mutate: remove, isPending: isDeleting } = useMutation({
    mutationFn: () => deleteSubTask(taskId, sub.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      toast.success('Subtask deleted');
    },
    onError: () => toast.error('Failed to delete subtask'),
  });

  const statusConfig = STATUS_CONFIG[sub.status];

  return (
    <div className="flex items-start gap-3 py-3 border-b border-zinc-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-zinc-800 truncate">{sub.title}</span>
          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${PRIORITY_BADGE[sub.priority]}`}>
            {sub.priority}
          </span>
        </div>
        {sub.description && (
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{sub.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <select
            value={sub.status}
            onChange={(e) => changeStatus(e.target.value as TaskStatus)}
            className={`text-xs font-medium rounded-full px-2.5 py-0.5 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusConfig.color}`}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="bg-white text-zinc-900">{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
          {sub.assigned_to.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {sub.assigned_to.map((u) => (
                <span key={u.id} className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-100">
                  {u.full_name}
                </span>
              ))}
            </div>
          )}
          {sub.due_date && (
            <span className="text-[11px] text-zinc-400">
              Due {format(new Date(sub.due_date + 'T00:00:00'), 'MMM d')}
            </span>
          )}
        </div>
      </div>
      {isAdmin && (
        <div className="shrink-0 flex items-center gap-1">
          {confirmDelete ? (
            <>
              <button
                onClick={() => remove()}
                disabled={isDeleting}
                className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {isDeleting ? '…' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 border border-zinc-300 text-zinc-500 text-xs font-medium rounded hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1 text-zinc-400 hover:text-red-500 transition-colors rounded"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface CreateSubTaskFormProps {
  taskId: number;
  projectId: number;
  onClose: () => void;
}

function CreateSubTaskForm({ taskId, projectId, onClose }: CreateSubTaskFormProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
  });

  const activeMembers = project?.members.filter((u) => u.is_active) ?? [];

  function toggleAssignee(id: number) {
    setSelectedAssignees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      createSubTask(taskId, {
        title,
        description: description || undefined,
        status,
        priority,
        due_date: dueDate || null,
        assigned_to_ids: selectedAssignees,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      toast.success('Subtask created');
      onClose();
    },
    onError: () => toast.error('Failed to create subtask'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    mutate();
  }

  const INPUT = 'w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const SELECT = 'w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 space-y-3">
      <div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Subtask title *"
          className={INPUT}
          autoFocus
        />
      </div>
      <div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className={`${INPUT} resize-none`}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className={SELECT}>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div>
          <select value={priority} onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')} className={SELECT}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      {activeMembers.length > 0 && (
        <div>
          <p className="text-xs font-medium text-zinc-500 mb-1.5">Assign to</p>
          <div className="flex flex-wrap gap-1.5">
            {activeMembers.map((u) => {
              const selected = selectedAssignees.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleAssignee(u.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    selected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-400'
                  }`}
                >
                  {u.full_name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={INPUT}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 border border-zinc-300 text-zinc-600 text-xs font-medium rounded-lg hover:bg-zinc-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !title.trim()}
          className="flex-1 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Creating…' : 'Add Subtask'}
        </button>
      </div>
    </form>
  );
}

interface Props {
  task: Task;
  isAdmin: boolean;
}

export default function SubTaskSection({ task, isAdmin }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const subtasks = task.subtasks ?? [];
  const doneCount = subtasks.filter((s) => s.status === 'done').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-zinc-700 hover:text-zinc-900 transition-colors"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Subtasks
          {subtasks.length > 0 && (
            <span className="text-xs font-normal text-zinc-400">
              {doneCount}/{subtasks.length} done
            </span>
          )}
        </button>
        {isAdmin && !showForm && (
          <button
            onClick={() => { setShowForm(true); setExpanded(true); }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Plus size={12} />
            Add subtask
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-2">
          {showForm && (
            <CreateSubTaskForm
              taskId={task.id}
              projectId={task.project}
              onClose={() => setShowForm(false)}
            />
          )}
          {subtasks.length === 0 && !showForm ? (
            <p className="text-xs text-zinc-400 py-2">No subtasks yet.</p>
          ) : (
            subtasks.map((sub) => (
              <SubTaskRow key={sub.id} sub={sub} taskId={task.id} isAdmin={isAdmin} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
