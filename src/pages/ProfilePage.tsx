import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { getProfile } from '../lib/profileClient';

function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [username, setUsername] = useState('');
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
        setUsername(data?.username ?? '');
      }
      setLoading(false);
    }

    loadProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setMessage(null);
    setSaving(true);

    const { error } = await updateProfile({ username: username.trim() });
    if (error) {
      setMessage(error.message || 'Unable to save username.');
    } else {
      setMessage('Username saved successfully.');
    }

    setSaving(false);
  };

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted">Profile</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Account settings</h2>
        </div>
      </div>
      <div className="rounded-[2rem] border border-border bg-[#111827] p-6 shadow-lg shadow-black/10">
        <p className="text-sm text-slate-300">Update your profile, theme preferences, and authentication settings.</p>

        <div className="mt-6 space-y-6 rounded-3xl border border-border bg-[#0f172a] p-6">
          <div>
            <div className="text-sm text-slate-400">Email</div>
            <div className="mt-2 rounded-3xl border border-border bg-[#111827] px-4 py-3 text-slate-100">{user?.email ?? 'No email available'}</div>
          </div>

          <div>
            <label className="text-sm text-slate-400">Username</label>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Choose a username"
              disabled={loading}
              className="mt-3 w-full rounded-3xl border border-border bg-[#111827] px-4 py-3 text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {message ? <p className="text-sm text-slate-200">{message}</p> : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-3xl bg-accent px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-accent/90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save username'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default ProfilePage;
