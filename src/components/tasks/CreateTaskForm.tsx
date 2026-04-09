import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { createTask, createSubTask, getTasks } from '../../api/tasks';
import type { User, TaskStatus, TaskPriority } from '../../types';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assigned_to_ids: z.array(z.number()).optional(),
  status: z.enum(['todo', 'in_progress', 'in_review', 'done'] as const),
  priority: z.enum(['low', 'medium', 'high'] as const),
  due_date: z.string().optional(),
  prerequisite_ids: z.array(z.number()).optional(),
});

type FormValues = z.infer<typeof schema>;

interface DraftSubTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
}

interface Props {
  projectId: number;
  members: User[];
  onClose: () => void;
}

const INPUT = 'w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const SELECT = 'w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500';

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do', blocked: 'Blocked', in_progress: 'In Progress', in_review: 'In Review', done: 'Done',
};
const PRIORITY_LABELS: Record<TaskPriority, string> = { low: 'Low', medium: 'Medium', high: 'High' };

export default function CreateTaskForm({ projectId, members, onClose }: Props) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<DraftSubTask[]>([]);
  const [newSubTitle, setNewSubTitle] = useState('');
  const [prereqOpen, setPrereqOpen] = useState(false);

  const { data: existingTasks } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => getTasks(projectId),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: FormValues) => {
      const task = await createTask(projectId, {
        ...data,
        due_date: data.due_date || null,
        assigned_to_ids: data.assigned_to_ids ?? [],
        prerequisite_ids: data.prerequisite_ids ?? [],
      });
      // Create subtasks sequentially
      for (const draft of drafts) {
        await createSubTask(task.id, {
          title: draft.title,
          status: draft.status,
          priority: draft.priority,
        });
      }
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      toast.success('Task created');
      onClose();
    },
    onError: () => toast.error('Failed to create task'),
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'todo', priority: 'medium', assigned_to_ids: [], prerequisite_ids: [] },
  });

  const selectedAssignees = watch('assigned_to_ids') ?? [];
  const selectedPrereqs = watch('prerequisite_ids') ?? [];
  const activeMembers = members.filter((u) => u.is_active);

  function toggleAssignee(id: number) {
    setValue(
      'assigned_to_ids',
      selectedAssignees.includes(id) ? selectedAssignees.filter((x) => x !== id) : [...selectedAssignees, id],
    );
  }

  function togglePrereq(id: number) {
    setValue(
      'prerequisite_ids',
      selectedPrereqs.includes(id) ? selectedPrereqs.filter((x) => x !== id) : [...selectedPrereqs, id],
    );
  }

  function addDraft() {
    if (!newSubTitle.trim()) return;
    setDrafts((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: newSubTitle.trim(), status: 'todo', priority: 'medium' },
    ]);
    setNewSubTitle('');
  }

  function removeDraft(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  function updateDraft(id: string, field: 'status' | 'priority', value: string) {
    setDrafts((prev) => prev.map((d) => d.id === id ? { ...d, [field]: value } : d));
  }

  return (
    <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Title *</label>
        <input {...register('title')} placeholder="Task title" className={INPUT} />
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Description</label>
        <textarea {...register('description')} rows={3} placeholder="Optional details..." className={`${INPUT} resize-none`} />
      </div>

      {/* Status + Priority */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Status</label>
          <select {...register('status')} className={SELECT}>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Priority</label>
          <select {...register('priority')} className={SELECT}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* Assign to */}
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-2">
          Assign to
          {selectedAssignees.length > 0 && <span className="ml-1 text-zinc-400">({selectedAssignees.length})</span>}
        </label>
        {activeMembers.length === 0 ? (
          <p className="text-xs text-zinc-400">No members in this project.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {activeMembers.map((u) => {
              const selected = selectedAssignees.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleAssignee(u.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-400'
                  }`}
                >
                  {u.full_name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Due date */}
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Due date</label>
        <input {...register('due_date')} type="date" className={INPUT} />
      </div>

      {/* Prerequisites — collapsible clean list */}
      {existingTasks && existingTasks.length > 0 && (
        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setPrereqOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
          >
            <span className="text-xs font-medium text-zinc-600">
              Prerequisites
              {selectedPrereqs.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                  {selectedPrereqs.length}
                </span>
              )}
            </span>
            {prereqOpen ? <ChevronUp size={13} className="text-zinc-400" /> : <ChevronDown size={13} className="text-zinc-400" />}
          </button>
          {prereqOpen && (
            <div className="divide-y divide-zinc-100 max-h-44 overflow-y-auto">
              {existingTasks.map((t) => {
                const selected = selectedPrereqs.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-zinc-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => togglePrereq(t.id)}
                      className="w-3.5 h-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs text-zinc-700 truncate">{t.title}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Subtasks */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 bg-zinc-50">
          <span className="text-xs font-medium text-zinc-600">
            Subtasks
            {drafts.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                {drafts.length}
              </span>
            )}
          </span>
        </div>

        {drafts.length > 0 && (
          <div className="divide-y divide-zinc-100">
            {drafts.map((draft) => (
              <div key={draft.id} className="flex items-center gap-2 px-3 py-2">
                <span className="flex-1 text-xs text-zinc-800 truncate">{draft.title}</span>
                <select
                  value={draft.status}
                  onChange={(e) => updateDraft(draft.id, 'status', e.target.value)}
                  className="text-[11px] border border-zinc-200 rounded px-1.5 py-0.5 text-zinc-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {(Object.entries(STATUS_LABELS) as [TaskStatus, string][])
                    .filter(([v]) => v !== 'blocked')
                    .map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <select
                  value={draft.priority}
                  onChange={(e) => updateDraft(draft.id, 'priority', e.target.value)}
                  className="text-[11px] border border-zinc-200 rounded px-1.5 py-0.5 text-zinc-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {(Object.entries(PRIORITY_LABELS) as [TaskPriority, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <button type="button" onClick={() => removeDraft(draft.id)} className="text-zinc-400 hover:text-red-500 transition-colors">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-2 border-t border-zinc-100">
          <input
            type="text"
            value={newSubTitle}
            onChange={(e) => setNewSubTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDraft(); } }}
            placeholder="Add a subtask..."
            className="flex-1 text-xs bg-transparent placeholder:text-zinc-400 text-zinc-800 focus:outline-none"
          />
          <button
            type="button"
            onClick={addDraft}
            disabled={!newSubTitle.trim()}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50 disabled:opacity-40 transition-colors"
          >
            <Plus size={11} />
            Add
          </button>
        </div>
      </div>

      {/* Submit */}
      <div className="pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Creating…' : drafts.length > 0 ? `Create Task + ${drafts.length} subtask${drafts.length > 1 ? 's' : ''}` : 'Create Task'}
        </button>
      </div>
    </form>
  );
}
