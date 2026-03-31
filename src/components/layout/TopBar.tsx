import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { getNotifications } from '../../api/notifications';

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 10_000,
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  return (
    <header className="h-14 bg-white border-b border-zinc-300 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-sm font-semibold text-zinc-800">{title}</h1>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-blue-600 text-white text-[10px] font-semibold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white">
            {user?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="text-sm font-medium text-zinc-700">{user?.full_name}</span>
        </div>
      </div>
    </header>
  );
}
