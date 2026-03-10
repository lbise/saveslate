import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from '@/hooks/api';
import { ApiError } from '@/lib/api-client';

export function Login() {
  const navigate = useNavigate();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    login.mutate(
      { email, password },
      {
        onSuccess: () => navigate('/', { replace: true }),
        onError: (err) => {
          if (err instanceof ApiError) {
            setError(err.status === 401 ? 'Invalid email or password.' : err.message);
          } else {
            setError('Something went wrong. Please try again.');
          }
        },
      },
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <Card className="p-6 sm:p-7">
          <div className="mb-5">
            <h1 className="font-display text-2xl font-medium tracking-tight text-foreground">Welcome back</h1>
            <p className="text-base text-dimmed mt-1">Sign in to continue to SaveSlate.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="login-email" className="mb-1.5 block">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <Label htmlFor="login-password">Password</Label>
              </div>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="text-sm text-dimmed mt-5 text-center">
            New here?{' '}
            <Link to="/register" className="text-sm text-dimmed hover:text-foreground inline-flex items-center gap-1 transition-colors duration-150">Create an account</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
