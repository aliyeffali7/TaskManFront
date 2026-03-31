import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getMyTasks } from '../api/tasks';
import type { TaskStatus } from '../types';
import { STATUS_CONFIG } from '../utils/statusConfig';

const STATUS_ORDER: TaskStatus[] = ['blocked', 'todo', 'in_progress', 'in_review', 'done'];

export default function DashboardPage() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: getMyTasks,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-zinc-200 rounded-lg animate-pulse" />
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
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors"
                >
                  <span className="text-sm font-medium text-zinc-800">{task.title}</span>
                  {task.due_date && (
                    <span className="text-xs text-zinc-400 shrink-0 ml-4">{task.due_date}</span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
