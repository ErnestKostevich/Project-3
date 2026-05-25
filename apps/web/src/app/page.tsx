export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-24">
      <header className="space-y-4">
        <span className="inline-block rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
          🚧 Pre-alpha · building in public
        </span>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
          Click anything.
          <br />
          Get a clean table.
        </h1>
        <p className="max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
          Pluck is an AI-powered visual web scraper. Point at the data you want — Pluck infers the
          pattern, handles pagination, and ships it to Google Sheets, a CSV, or your webhook. No
          selectors, no code.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Feature
          title="One-click pattern inference"
          body="Click an example row. The AI figures out every other row, every column, and the pagination, in seconds."
        />
        <Feature
          title="Scheduled runs in the cloud"
          body="Set it once. Pluck re-runs your job hourly, daily, or on any cron — with rotating proxies and CAPTCHA solving handled."
        />
        <Feature
          title="Ships where you actually need it"
          body="Google Sheets, Airtable, CSV, or a signed webhook — pick a destination and forget about it."
        />
        <Feature
          title="Built for operators, not engineers"
          body="No CSS, no XPath, no Python. If you can use a spreadsheet, you can use Pluck."
        />
      </section>

      <footer className="flex flex-wrap items-center gap-4 border-t border-neutral-200 pt-8 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        <span>© {new Date().getFullYear()} Pluck</span>
        <span aria-hidden>·</span>
        <a
          className="hover:text-neutral-900 dark:hover:text-neutral-200"
          href="https://github.com/ErnestKostevich/Project-3"
        >
          GitHub
        </a>
      </footer>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{body}</p>
    </div>
  );
}
