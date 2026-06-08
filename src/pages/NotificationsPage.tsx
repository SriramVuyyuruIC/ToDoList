function NotificationsPage() {
  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted">Notifications</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Activity and alerts</h2>
        </div>
      </div>
      <div className="rounded-[2rem] border border-border bg-[#111827] p-6 shadow-lg shadow-black/10">
        <p className="text-sm text-slate-300">TaskFlow will notify you when tasks are assigned, due soon, or updated by your team.</p>
      </div>
    </section>
  );
}

export default NotificationsPage;
