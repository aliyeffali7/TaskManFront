import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, Ticket, Bell, Users, Settings, LogOut, CalendarDays, CheckSquare2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { logout } from '../../api/auth';
import { toast } from 'sonner';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/tickets', icon: Ticket, label: 'Tickets' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
];

const adminNavItems = [
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/admin', icon: Settings, label: 'Admin' },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-600 text-white'
      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
  }`;

export default function Sidebar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isAdmin = user?.is_admin;

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
    clearAuth();
    navigate('/login');
  };

  return (
    <aside className="w-56 shrink-0 bg-zinc-900 flex flex-col min-h-screen border-r border-zinc-700">
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-zinc-700">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <CheckSquare2 size={16} className="text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">TaskMan</p>
          <p className="text-[11px] text-zinc-500 leading-tight">Desinftec</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className={linkClass}>
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Admin</span>
            </div>
            {adminNavItems.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} className={linkClass}>
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="px-3 pb-4 border-t border-zinc-700 pt-3 space-y-1">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white shrink-0">
            {user?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-200 truncate">{user?.full_name}</p>
            <p className="text-[10px] text-zinc-500 truncate">{user?.role_label}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </aside>
  );
}
