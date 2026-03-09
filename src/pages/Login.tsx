import { Link } from 'react-router-dom';

export function Login() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <div className="card p-6 sm:p-7">
          <div className="mb-5">
            <h1 className="heading-1">Welcome back</h1>
            <p className="text-body text-dimmed mt-1">Sign in to continue to SaveSlate.</p>
          </div>

          <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
            <div>
              <label htmlFor="login-email" className="label mb-1.5 block">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="login-password" className="label">Password</label>
                <button type="button" className="btn-ghost px-2 py-1">Forgot?</button>
              </div>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                className="input"
                placeholder="Enter password"
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full">Sign in</button>
          </form>

          <p className="text-ui text-dimmed mt-5 text-center">
            New here?{' '}
            <Link to="/register" className="text-link">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
