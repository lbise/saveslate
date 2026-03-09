import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function Register() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <Card className="p-6 sm:p-7">
          <div className="mb-5">
            <h1 className="font-display text-2xl font-medium tracking-tight text-foreground">Create account</h1>
            <p className="text-base text-dimmed mt-1">Set up your SaveSlate profile.</p>
          </div>

          <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
            <div>
              <Label htmlFor="register-name" className="mb-1.5 block">Full name</Label>
              <Input
                id="register-name"
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
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
                required
              />
            </div>

            <div>
              <Label htmlFor="register-password-confirm" className="mb-1.5 block">Confirm password</Label>
              <Input
                id="register-password-confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat password"
                required
              />
            </div>

            <Button type="submit" className="w-full">Create account</Button>
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
