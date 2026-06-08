import { useEffect, useMemo, useState } from 'react';
import { Camera, Mail, Save, UserRound } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { getProfile } from '../lib/profileClient';

const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
];

function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York');
  const [themePreference, setThemePreference] = useState<'dark' | 'system'>('dark');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await getProfile(user.id);
      if (error) {
        setMessage(error.message || 'Unable to load profile.');
      } else {
        setDisplayName(data?.display_name ?? (user.email?.split('@')[0] || ''));
        setAvatarUrl(data?.avatar_url ?? '');
        setTimezone(data?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'America/New_York');
        setThemePreference(data?.theme_preference ?? 'dark');
      }
      setLoading(false);
    }

    loadProfile();
  }, [user]);

  const initials = useMemo(() => {
    const source = displayName || user?.email || 'TaskFlow';
    return source
      .split(/[ @._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [displayName, user?.email]);

  const handleSave = async () => {
    if (!user) return;
    setMessage(null);
    setSaving(true);

    const { error } = await updateProfile({
      displayName: displayName.trim() || user.email?.split('@')[0] || 'TaskFlow User',
      avatarUrl: avatarUrl.trim(),
      timezone,
      themePreference,
    });
    if (error) {
      setMessage(error.message || 'Unable to save profile.');
    } else {
      setMessage('Profile saved.');
    }

    setSaving(false);
  };

  return (
    <section className="space-y-4">
      <div className="border border-border bg-surface p-4 shadow-xl shadow-black/10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Profile</p>
        <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Account settings</h2>
      </div>

      {message ? <p className="rounded-lg border border-border bg-[#0b101d] px-4 py-3 text-sm text-slate-200">{message}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="h-fit rounded-lg border border-border bg-surface p-4 shadow-lg shadow-black/10">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg border border-border bg-[#0b101d]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-semibold text-white">{initials}</span>
              )}
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">{displayName || 'TaskFlow User'}</h3>
            <p className="mt-1 text-sm text-slate-400">{user?.email}</p>
          </div>
        </aside>

        <div className="rounded-lg border border-border bg-surface p-4 shadow-lg shadow-black/10">
          <div className="grid gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                <Mail className="h-4 w-4 text-accent" />
                Email
              </div>
              <div className="rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100">{user?.email ?? 'No email available'}</div>
            </div>

            <label className="block text-sm text-slate-400">
              Display name
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your name"
                disabled={loading}
                className="mt-2 w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
              />
            </label>

            <label className="block text-sm text-slate-400">
              <span className="inline-flex items-center gap-2">
                <Camera className="h-4 w-4 text-accent" />
                Avatar URL
              </span>
              <input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://..."
                disabled={loading}
                className="mt-2 w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-slate-400">
                Time zone
                <select
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  disabled={loading}
                  className="mt-2 w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                >
                  {[timezone, ...timezones.filter((item) => item !== timezone)].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-400">
                Theme
                <select
                  value={themePreference}
                  onChange={(event) => setThemePreference(event.target.value as 'dark' | 'system')}
                  disabled={loading}
                  className="mt-2 w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                >
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-[#0b101d] p-4">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-accent" />
              <p className="text-sm font-semibold text-white">Account scope</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">Your profile is shared across projects, task assignments, comments, and activity history.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProfilePage;
