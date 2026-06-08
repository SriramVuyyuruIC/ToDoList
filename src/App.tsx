import { Link, Route, Routes } from 'react-router-dom';
import { CalendarDays, LayoutDashboard, ListChecks, Bell, User } from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import CalendarPage from './pages/CalendarPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Projects', path: '/projects', icon: ListChecks },
  { label: 'Calendar', path: '/calendar', icon: CalendarDays },
  { label: 'Notifications', path: '/notifications', icon: Bell },
  { label: 'Profile', path: '/profile', icon: User },
];

function App() {
  return (
    <div className="min-h-screen bg-background text-slate-100">
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
          <div className="mb-6 rounded-[2rem] border border-border bg-surface p-6 shadow-xl shadow-black/10">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
