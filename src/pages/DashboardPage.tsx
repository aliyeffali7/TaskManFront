import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getMyTasks, updateTaskStatus } from '../api/tasks';
import { getProjects } from '../api/projects';
import type { Task, TaskStatus } from '../types';
import { STATUS_CONFIG } from '../utils/statusConfig';
import { toast } from 'sonner';

const STATUS_ORDER: TaskStatus[] = ['blocked', 'todo', 'in_progress', 'in_review', 'done'];
const STATUS_OPTIONS: TaskStatus[] = ['todo', 'blocked', 'in_progress', 'in_review', 'done'];

export default function DashboardPage() {
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: getMyTasks,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });

  const projectMap = projects?.reduce<Record<number, string>>((acc, p) => {
    acc[p.id] = p.name;
    return acc;
  }, {}) ?? {};

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
      updateTaskStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['my-tasks'] });
      const previous = queryClient.getQueryData<Task[]>(['my-tasks']);
      queryClient.setQueryData<Task[]>(['my-tasks'], (old) =>
        old?.map((t) => (t.id === id ? { ...t, status } : t)) ?? [],
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['my-tasks'], context.previous);
      }
      toast.error('Failed to update status');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-zinc-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!tasks?.length) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <p className="text-zinc-400 text-sm">No tasks assigned to you yet.</p>
      </div>
    );
  }

  const grouped = STATUS_ORDER.reduce<Record<TaskStatus, typeof tasks>>(
    (acc, status) => {
      acc[status] = tasks.filter((t) => t.status === status);
      return acc;
    },
    {} as Record<TaskStatus, typeof tasks>,
  );

  return (
    <div className="p-6 space-y-6">
      {STATUS_ORDER.map((status) => {
        const group = grouped[status];
        if (!group.length) return null;
        const config = STATUS_CONFIG[status];
        return (
          <section key={status}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
                {config.label}
              </span>
              <span className="text-xs text-zinc-400">{group.length}</span>
            </div>
            <div className="bg-white rounded-lg border border-zinc-300 divide-y divide-zinc-200 shadow-sm">
              {group.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-50 transition-colors"
                >
                  {/* Title — navigates to task detail */}
                  <Link
                    to={`/tasks/${task.id}`}
                    className="flex-1 min-w-0 text-sm font-medium text-zinc-800 hover:text-blue-600 truncate"
                  >
                    {task.title}
                  </Link>

                  {/* Project name */}
                  {projectMap[task.project] && (
                    <span className="hidden sm:block text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded shrink-0 max-w-[140px] truncate">
                      {projectMap[task.project]}
                    </span>
                  )}

                  {/* Status select */}
                  <select
                    value={task.status}
                    onChange={(e) =>
                      statusMutation.mutate({ id: task.id, status: e.target.value as TaskStatus })
                    }
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs border border-zinc-200 rounded-md px-2 py-1 bg-white text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 shrink-0 cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_CONFIG[s].label}
                      </option>
                    ))}
                  </select>

                  {/* Due date */}
                  {task.due_date ? (
                    <span className="text-xs text-zinc-400 shrink-0 w-20 text-right">
                      {task.due_date}
                    </span>
                  ) : (
                    <span className="w-20 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
