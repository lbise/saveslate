import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../../hooks';

/**
 * Route guard for authenticated routes.
 * Shows a loading state while checking auth, redirects to /login if not authenticated.
 */
export function AuthGuard() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
