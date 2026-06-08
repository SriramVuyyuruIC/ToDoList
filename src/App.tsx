import { NavLink, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { CalendarDays, LayoutDashboard, ListChecks, Bell, User, LogOut, Inbox } from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import InboxPage from './pages/InboxPage';
import ProjectsPage from './pages/ProjectsPage';
import CalendarPage from './pages/CalendarPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';
import { useAuth } from './auth/AuthProvider';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Inbox', path: '/inbox', icon: Inbox },
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
        Loading TaskFlow...
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
        <div className="mx-auto flex min-h-screen max-w-[1440px] gap-4 px-3 py-4 sm:px-4 lg:px-6">
          <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-72 shrink-0 flex-col border border-border bg-surface p-4 shadow-xl shadow-black/20 lg:flex">
            <div className="border-b border-border pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">TaskFlow</p>
              <h1 className="mt-3 text-2xl font-semibold text-white">Team tasks</h1>
              <p className="mt-2 text-sm text-slate-400">{user.email}</p>
            </div>
            <nav className="mt-4 flex flex-1 flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                        isActive
                          ? 'border-accent bg-red-500/10 text-white'
                          : 'border-transparent text-slate-300 hover:border-border hover:bg-[#151b2a] hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5 text-accent" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
            <button
              type="button"
              onClick={signOut}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-[#0f172a] px-4 py-2.5 text-sm text-slate-200 transition hover:border-accent hover:text-white"
            >
              <LogOut className="h-4 w-4 text-accent" />
              Sign out
            </button>
          </aside>

          <main className="min-w-0 flex-1 pb-24 lg:pb-0">
            <div className="mb-4 border border-border bg-surface p-4 shadow-xl shadow-black/10 lg:hidden">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">TaskFlow</p>
                  <p className="mt-1 text-sm text-slate-400">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-[#0f172a] px-4 py-2.5 text-sm text-slate-200 transition hover:border-accent hover:text-white"
                >
                  <LogOut className="h-4 w-4 text-accent" />
                  Sign out
                </button>
              </div>
            </div>

            <Routes>
              <Route path="/" element={<ProtectedRoute children={<DashboardPage />} />} />
              <Route path="/inbox" element={<ProtectedRoute children={<InboxPage />} />} />
              <Route path="/projects" element={<ProtectedRoute children={<ProjectsPage />} />} />
              <Route path="/calendar" element={<ProtectedRoute children={<CalendarPage />} />} />
              <Route path="/notifications" element={<ProtectedRoute children={<NotificationsPage />} />} />
              <Route path="/profile" element={<ProtectedRoute children={<ProfilePage />} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <nav className="fixed inset-x-3 bottom-3 z-20 grid grid-cols-6 gap-1 rounded-lg border border-border bg-surface/95 p-1 shadow-2xl shadow-black/40 backdrop-blur lg:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex min-w-0 flex-col items-center gap-1 rounded-md px-1 py-2 text-[0.68rem] transition ${
                      isActive ? 'bg-red-500/10 text-white' : 'text-slate-400 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 text-accent" />
                  <span className="max-w-full truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}

export default App;
