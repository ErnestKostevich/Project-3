export default function DashboardPlaceholder() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Not built yet. Phase 2 of the roadmap — once auth and persistence land, your saved jobs and
        run history will live here.
      </p>
      <a
        href="/"
        className="text-sm text-neutral-500 underline-offset-4 hover:underline dark:text-neutral-400"
      >
        ← Back to landing
      </a>
    </main>
  );
}
