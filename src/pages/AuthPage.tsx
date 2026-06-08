import { ArrowLeftRight, Lock, Mail, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

function AuthPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/';

  const [variant, setVariant] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    if (variant === 'register' && password !== confirmPassword) {
      setMessage('Passwords do not match.');
      setLoading(false);
      return;
    }

    const result =
      variant === 'login'
        ? await auth.signIn(email, password)
        : await auth.signUp(email, password, displayName.trim());

    setLoading(false);

    if (result.error) {
      setMessage(result.error.message || 'Authentication failed.');
      return;
    }

    navigate(from, { replace: true });
  };

  const handleReset = async () => {
    if (!email) {
      setMessage('Please enter your email address to reset your password.');
      return;
    }

    setLoading(true);
    const { error } = await auth.resetPassword(email);
    setLoading(false);

    if (error) {
      setMessage(error.message || 'Unable to send password reset email.');
      return;
    }

    setMessage('Password reset email sent if that account exists.');
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_440px]">
        <section className="hidden lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">TaskFlow</p>
          <h1 className="mt-4 max-w-2xl text-5xl font-semibold leading-tight text-white">Collaborative task management for focused teams</h1>
          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
            {['List', 'Kanban', 'Calendar'].map((item) => (
              <div key={item} className="rounded-lg border border-border bg-surface p-4 shadow-lg shadow-black/10">
                <p className="text-sm font-semibold text-white">{item}</p>
                <p className="mt-2 text-xs text-slate-500">View</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-6 shadow-xl shadow-black/20">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">TaskFlow</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">{variant === 'login' ? 'Welcome back' : 'Create account'}</h2>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {variant === 'register' ? (
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
                  <UserRound className="h-4 w-4 text-accent" /> Display name
                </span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
                <Mail className="h-4 w-4 text-accent" /> Email address
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
                <Lock className="h-4 w-4 text-accent" /> Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>

            {variant === 'register' ? (
              <label className="block">
                <span className="mb-2 text-sm font-medium text-slate-200">Confirm password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </label>
            ) : null}

            {message ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{message}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Working...' : variant === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-5 flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setVariant(variant === 'login' ? 'register' : 'login')}
              className="text-left underline transition hover:text-white"
            >
              {variant === 'login' ? 'Create an account' : 'Already have an account? Sign in'}
            </button>
            {variant === 'login' ? (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 text-accent transition hover:text-red-300"
              >
                <ArrowLeftRight className="h-4 w-4" /> Forgot password
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

export default AuthPage;
