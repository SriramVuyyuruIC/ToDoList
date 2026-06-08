import { Mail, Lock, ArrowLeftRight } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

function AuthPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/';

  const [variant, setVariant] = useState<'login' | 'register'>('login');
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
        : await auth.signUp(email, password);

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
      <div className="mx-auto max-w-md rounded-[2rem] border border-border bg-surface p-8 shadow-xl shadow-black/20">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-muted">TaskFlow</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">{variant === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="mt-2 text-sm text-slate-400">
            {variant === 'login'
              ? 'Sign in to access your workspace.'
              : 'Register a new account and start organizing your tasks.'}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
              <Mail className="h-4 w-4 text-accent" /> Email address
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-3xl border border-border bg-[#111827] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
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
              className="w-full rounded-3xl border border-border bg-[#111827] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
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
                className="w-full rounded-3xl border border-border bg-[#111827] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
          ) : null}

          {message ? <p className="rounded-3xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{message}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-3xl bg-accent px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Working...' : variant === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
          <button
            type="button"
            onClick={() => setVariant(variant === 'login' ? 'register' : 'login')}
            className="underline transition hover:text-white"
          >
            {variant === 'login' ? 'Create an account' : 'Already have an account? Sign in'}
          </button>
          {variant === 'login' ? (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 text-accent transition hover:text-accent/80"
            >
              <ArrowLeftRight className="h-4 w-4" /> Forgot password
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
