import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRegister } from '@/hooks/api';
import { ApiError } from '@/lib/api-client';

export function Register() {
  const navigate = useNavigate();
  const register = useRegister();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    register.mutate(
      { name, email, password },
      {
        onSuccess: () => navigate('/', { replace: true }),
        onError: (err) => {
          if (err instanceof ApiError) {
            if (err.status === 409) {
              setError('An account with this email already exists.');
            } else if (err.isValidationError) {
              setError('Please check your input and try again.');
            } else {
              setError(err.message);
            }
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
            <h1 className="font-display text-2xl font-medium tracking-tight text-foreground">Create account</h1>
            <p className="text-base text-dimmed mt-1">Set up your SaveSlate profile.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="register-name" className="mb-1.5 block">Full name</Label>
              <Input
                id="register-name"
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="register-email" className="mb-1.5 block">Email</Label>
              <Input
                id="register-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="register-password" className="mb-1.5 block">Password</Label>
              <Input
                id="register-password"
                type="password"
                autoComplete="new-password"
                placeholder="Create password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div>
              <Label htmlFor="register-password-confirm" className="mb-1.5 block">Confirm password</Label>
              <Input
                id="register-password-confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={register.isPending}>
              {register.isPending ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <p className="text-sm text-dimmed mt-5 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-sm text-dimmed hover:text-foreground inline-flex items-center gap-1 transition-colors duration-150">Sign in</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
