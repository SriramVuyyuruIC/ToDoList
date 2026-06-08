import { Link, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { CalendarDays, LayoutDashboard, ListChecks, Bell, User, LogOut } from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import CalendarPage from './pages/CalendarPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';
import { useAuth } from './auth/AuthProvider';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Projects', path: '/projects', icon: ListChecks },
  { label: 'Calendar', path: '/calendar', icon: CalendarDays },
  { label: 'Notifications', path: '/notifications', icon: Bell },
  { label: 'Profile', path: '/profile', icon: User },
];

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-slate-100">
        Loading authentication...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
}

function App() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background text-slate-100">
      {!user ? (
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      ) : (
        <div className="mx-auto flex min-h-screen max-w-[1400px] gap-4 px-4 py-6 lg:px-8">
          <aside className="hidden w-72 flex-col gap-4 rounded-3xl border border-border bg-surface p-6 shadow-xl shadow-black/20 lg:flex">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-muted">TaskFlow</p>
              <h1 className="mt-4 text-3xl font-semibold text-white">Collaborative workspace</h1>
            </div>
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-[#131827] px-4 py-3 text-sm text-slate-200 transition hover:border-accent hover:text-white"
                  >
                    <Icon className="h-5 w-5 text-accent" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1">
            <div className="mb-6 flex flex-col gap-6 rounded-[2rem] border border-border bg-surface p-6 shadow-xl shadow-black/10">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-muted">Signed in as</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{user.email}</h2>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  className="inline-flex items-center gap-2 rounded-3xl border border-border bg-[#111827] px-5 py-3 text-sm text-slate-200 transition hover:border-accent hover:text-white"
                >
                  <LogOut className="h-4 w-4 text-accent" />
                  Sign out
                </button>
              </div>

              <Routes>
                <Route path="/" element={<ProtectedRoute children={<DashboardPage />} />} />
                <Route path="/projects" element={<ProtectedRoute children={<ProjectsPage />} />} />
                <Route path="/calendar" element={<ProtectedRoute children={<CalendarPage />} />} />
                <Route path="/notifications" element={<ProtectedRoute children={<NotificationsPage />} />} />
                <Route path="/profile" element={<ProtectedRoute children={<ProfilePage />} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
