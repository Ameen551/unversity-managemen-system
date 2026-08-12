import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, tryRefresh } from '../api/client';
import { useAuthStore } from './authStore';
import type { Role, User } from '../types';
import { PageLoader } from '../components/ui/Spinner';

interface RequireAuthProps {
  role: 'teacher' | 'admin';
  children: React.ReactNode;
}

const requiredRoles: Record<'teacher' | 'admin', Role[]> = {
  teacher: ['TEACHER'],
  admin: ['ADMIN', 'HOD'],
};

export function RequireAuth({ role, children }: RequireAuthProps) {
  const { user, status } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (status === 'idle') {
      tryRefresh();
    }
  }, [status]);

  if (status === 'idle') return <PageLoader />;

  if (status === 'unauthenticated' || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!requiredRoles[role].includes(user.role)) {
    // Redirect a teacher to their portal or an admin to theirs.
    return <Navigate to={user.role === 'ADMIN' || user.role === 'HOD' ? '/admin/dashboard' : '/teacher/dashboard'} replace />;
  }

  return <>{children}</>;
}

/** Used to trigger a manual login from the login page. */
export async function performLogin(username: string, password: string): Promise<User> {
  const json = await api.post<{ user: User; accessToken: string }>('/auth/login', { username, password });
  useAuthStore.getState().setSession(json.user, json.accessToken);
  return json.user;
}
