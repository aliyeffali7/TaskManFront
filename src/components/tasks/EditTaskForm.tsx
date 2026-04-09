import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateTask, getTasks } from '../../api/tasks';
import { getProject } from '../../api/projects';
import type { Task } from '../../types';

const schema = z.object({
  title: z.string().min(1, 'Required'),
  description: z.string().optional(),
  assigned_to_ids: z.array(z.number()).optional(),
  status: z.enum(['todo', 'in_progress', 'in_review', 'done'] as const),
  priority: z.enum(['low', 'medium', 'high'] as const),
  due_date: z.string().optional(),
  prerequisite_ids: z.array(z.number()).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  task: Task;
  onClose: () => void;
}

const INPUT = 'w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const SELECT = 'w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function EditTaskForm({ task, onClose }: Props) {
  const queryClient = useQueryClient();

  const { data: project } = useQuery({ queryKey: ['project', task.project], queryFn: () => getProject(task.project) });
  const { data: existingTasks } = useQuery({ queryKey: ['tasks', task.project], queryFn: () => getTasks(task.project) });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormValues) =>
      updateTask(task.id, {
        ...data,
        due_date: data.due_date || null,
        assigned_to_ids: data.assigned_to_ids ?? [],
        prerequisite_ids: data.prerequisite_ids ?? [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks', task.project] });
      toast.success('Task updated');
      onClose();
    },
    onError: () => toast.error('Failed to update task'),
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: task.title,
      description: task.description,
      assigned_to_ids: task.assigned_to.map((u) => u.id),
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ?? '',
      prerequisite_ids: task.prerequisites,
    },
  });

  const selectedAssignees = watch('assigned_to_ids') ?? [];
  const selectedPrereqs = watch('prerequisite_ids') ?? [];
  const otherTasks = existingTasks?.filter((t) => t.id !== task.id) ?? [];
  const activeMembers = project?.members.filter((u) => u.is_active) ?? [];

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
        <input {...register('title')} className={INPUT} />
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Description</label>
        <textarea {...register('description')} rows={3} className={`${INPUT} resize-none`} />
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
          <p className="text-xs text-zinc-400">No active members in this project.</p>
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

      {otherTasks.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-2">
            Prerequisites
            {selectedPrereqs.length > 0 && <span className="ml-1 text-zinc-400">({selectedPrereqs.length})</span>}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {otherTasks.map((t) => {
              const selected = selectedPrereqs.includes(t.id);
              return (
                <button key={t.id} type="button" onClick={() => togglePrereq(t.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-400'}`}
                >
                  {t.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-zinc-300 text-zinc-600 text-sm font-medium rounded-lg hover:bg-zinc-50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
