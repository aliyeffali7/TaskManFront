import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markAsRead, markAllAsRead } from '../api/notifications';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Notification } from '../types';

function getNotificationLink(n: Notification): string | null {
  if (!n.object_id || !n.object_type) return null;
  if (n.object_type === 'task') return `/tasks/${n.object_id}`;
  if (n.object_type === 'ticket') return `/tickets`;
  return null;
}

const TYPE_ICONS: Record<string, string> = {
  task_assigned: '📋',
  task_unblocked: '🔓',
  mentioned_in_comment: '💬',
  ticket_status_changed: '🎫',
  tagged_in_ticket: '🏷️',
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: getNotifications });
  const { mutate: markOne } = useMutation({ mutationFn: markAsRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }), onError: () => toast.error('Failed') });
  const { mutate: markAll } = useMutation({ mutationFn: markAllAsRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }), onError: () => toast.error('Failed') });

  const handleClick = (n: Notification) => {
    if (!n.is_read) markOne(n.id);
    const link = getNotificationLink(n);
    if (link) navigate(link);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-3 max-w-2xl">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-zinc-200 rounded-lg animate-pulse" />)}
      </div>
    );
  }

  if (!notifications?.length) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <p className="text-zinc-400 text-sm">You're all caught up.</p>
      </div>
    );
  }

  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div className="p-6 max-w-2xl">
      {hasUnread && (
        <div className="flex justify-end mb-3">
          <button onClick={() => markAll()} className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2 transition-colors">
            Mark all as read
          </button>
        </div>
      )}
      <div className="bg-white rounded-lg border border-zinc-300 shadow-sm divide-y divide-zinc-200 overflow-hidden">
        {notifications.map((n) => {
          const link = getNotificationLink(n);
          return (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${!n.is_read ? 'bg-blue-50/60' : ''} ${link ? 'cursor-pointer hover:bg-zinc-50' : ''}`}
            >
              <span className="text-base shrink-0 mt-0.5">{TYPE_ICONS[n.type] ?? '🔔'}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.is_read ? 'text-zinc-500' : 'text-zinc-800 font-medium'}`}>{n.message}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {format(new Date(n.created_at), 'MMM d, yyyy · HH:mm')}
                  {link && <span className="ml-2 text-blue-500">→ View</span>}
                </p>
              </div>
              {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
