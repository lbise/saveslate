import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function Login() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <Card className="p-6 sm:p-7">
          <div className="mb-5">
            <h1 className="font-display text-2xl font-medium tracking-tight text-foreground">Welcome back</h1>
            <p className="text-base text-dimmed mt-1">Sign in to continue to SaveSlate.</p>
          </div>

          <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
            <div>
              <Label htmlFor="login-email" className="mb-1.5 block">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <Label htmlFor="login-password">Password</Label>
                <Button variant="ghost" type="button" size="xs">Forgot?</Button>
              </div>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter password"
                required
              />
            </div>

            <Button type="submit" className="w-full">Sign in</Button>
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
