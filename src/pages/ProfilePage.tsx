function ProfilePage() {
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
      </div>
    </section>
  );
}

export default ProfilePage;
