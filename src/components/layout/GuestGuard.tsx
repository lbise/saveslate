import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../../hooks';

/**
 * Route guard for guest-only routes (login, register).
 * Redirects to / if the user is already authenticated.
 */
export function GuestGuard() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
