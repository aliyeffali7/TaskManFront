import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import axios from 'axios';
import { router } from './router';
import { useAuthStore } from './store/authStore';
import { getMe } from './api/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const { setAccessToken, setUser, clearAuth } = useAuthStore();

  useEffect(() => {
    async function bootstrap() {
      try {
        const res = await axios.post<{ access: string }>(
          `${import.meta.env.VITE_API_BASE_URL}/auth/token/refresh/`,
          {},
          { withCredentials: true },
        );
        setAccessToken(res.data.access);
        const user = await getMe();
        setUser(user);
      } catch {
        clearAuth();
      } finally {
        setReady(true);
      }
    }
    bootstrap();
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="w-6 h-6 border-2 border-zinc-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
