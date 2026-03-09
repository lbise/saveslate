import { Link } from 'react-router-dom';

export function Register() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <div className="card p-6 sm:p-7">
          <div className="mb-5">
            <h1 className="heading-1">Create account</h1>
            <p className="text-body text-dimmed mt-1">Set up your SaveSlate profile.</p>
          </div>

          <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
            <div>
              <label htmlFor="register-name" className="label mb-1.5 block">Full name</label>
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                className="input"
                placeholder="Jane Doe"
                required
              />
            </div>

            <div>
              <label htmlFor="register-email" className="label mb-1.5 block">Email</label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="register-password" className="label mb-1.5 block">Password</label>
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                className="input"
                placeholder="Create password"
                required
              />
            </div>

            <div>
              <label htmlFor="register-password-confirm" className="label mb-1.5 block">Confirm password</label>
              <input
                id="register-password-confirm"
                type="password"
                autoComplete="new-password"
                className="input"
                placeholder="Repeat password"
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full">Create account</button>
          </form>

          <p className="text-ui text-dimmed mt-5 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
