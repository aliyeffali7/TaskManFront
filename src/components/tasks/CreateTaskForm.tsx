import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createTask, getTasks } from '../../api/tasks';
import type { User } from '../../types';

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

interface Props {
  projectId: number;
  members: User[];
  onClose: () => void;
}

const INPUT = 'w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const SELECT = 'w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function CreateTaskForm({ projectId, members, onClose }: Props) {
  const queryClient = useQueryClient();

  const { data: existingTasks } = useQuery({ queryKey: ['tasks', projectId], queryFn: () => getTasks(projectId) });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormValues) =>
      createTask(projectId, {
        ...data,
        due_date: data.due_date || null,
        assigned_to_ids: data.assigned_to_ids ?? [],
        prerequisite_ids: data.prerequisite_ids ?? [],
      }),
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
      selectedAssignees.includes(id)
        ? selectedAssignees.filter((x) => x !== id)
        : [...selectedAssignees, id],
    );
  }

  function togglePrereq(id: number) {
    setValue(
      'prerequisite_ids',
      selectedPrereqs.includes(id) ? selectedPrereqs.filter((x) => x !== id) : [...selectedPrereqs, id],
    );
  }

  return (
    <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Title *</label>
        <input {...register('title')} placeholder="Task title" className={INPUT} />
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Description</label>
        <textarea {...register('description')} rows={3} placeholder="Optional details..." className={`${INPUT} resize-none`} />
      </div>

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
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Due date</label>
        <input {...register('due_date')} type="date" className={INPUT} />
      </div>

      {existingTasks && existingTasks.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-2">
            Prerequisites
            {selectedPrereqs.length > 0 && <span className="ml-1 text-zinc-400">({selectedPrereqs.length})</span>}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {existingTasks.map((t) => {
              const selected = selectedPrereqs.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => togglePrereq(t.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-400'
                  }`}
                >
                  {t.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="pt-1">
        <button type="submit" disabled={isPending} className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {isPending ? 'Creating…' : 'Create Task'}
        </button>
      </div>
    </form>
  );
}
