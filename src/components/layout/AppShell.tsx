import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/calendar': 'Calendar',
  '/projects': 'Projects',
  '/tickets': 'Tickets',
  '/notifications': 'Notifications',
  '/users': 'Users',
  '/admin': 'Admin',
};

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/projects/')) return 'Project';
  if (pathname.startsWith('/tasks/')) return 'Task';
  return 'TaskMan';
}

export default function AppShell() {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={getTitle(pathname)} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
