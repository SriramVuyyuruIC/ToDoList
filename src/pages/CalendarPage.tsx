function CalendarPage() {
  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted">Calendar</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Due date overview</h2>
        </div>
      </div>
      <div className="rounded-[2rem] border border-border bg-[#111827] p-6 shadow-lg shadow-black/10">
        <p className="text-sm text-slate-300">Month and week views will show tasks by due date, allowing you to keep deadlines at a glance.</p>
      </div>
    </section>
  );
}

export default CalendarPage;
