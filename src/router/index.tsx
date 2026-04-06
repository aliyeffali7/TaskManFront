import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import AppShell from '../components/layout/AppShell';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import ProjectsPage from '../pages/ProjectsPage';
import ProjectDetailPage from '../pages/ProjectDetailPage';
import TaskDetailPage from '../pages/TaskDetailPage';
import TicketsPage from '../pages/TicketsPage';
import NotificationsPage from '../pages/NotificationsPage';
import AdminPage from '../pages/AdminPage';
import UsersPage from '../pages/UsersPage';
import CalendarPage from '../pages/CalendarPage';
import DrivePage from '../pages/DrivePage';

function AuthGuard() {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function AdminGuard() {
  const user = useAuthStore((s) => s.user);
  if (!user?.is_admin) return <Navigate to="/" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/calendar', element: <CalendarPage /> },
          { path: '/projects/:id', element: <ProjectDetailPage /> },
          { path: '/tasks/:id', element: <TaskDetailPage /> },
          { path: '/tickets', element: <TicketsPage /> },
          { path: '/notifications', element: <NotificationsPage /> },
          {
            element: <AdminGuard />,
            children: [
              { path: '/projects', element: <ProjectsPage /> },
              { path: '/drive', element: <DrivePage /> },
              { path: '/users', element: <UsersPage /> },
              { path: '/admin', element: <AdminPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
