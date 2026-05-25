export const metadata = {
  title: 'Privacy Policy — Pluck',
  description:
    'How Pluck handles your data. TL;DR: we don\'t see your scrapes, your AI key, or your saved jobs.',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <h1 className="text-5xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400">
          Last updated: 2026-05-25
        </p>
      </header>

      <section className="space-y-6 text-neutral-700 dark:text-neutral-300">
        <p className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <strong className="text-neutral-900 dark:text-neutral-100">TL;DR.</strong> Pluck doesn&apos;t
          send your scrapes, your AI key, or your saved jobs to any Pluck server. Everything lives
          in your browser. The only data we receive is your email at purchase time, so we can email
          you a license.
        </p>

        <h2 className="mt-12 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          What Pluck stores, and where
        </h2>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Saved jobs, settings, and run results</strong> are persisted in{' '}
            <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">
              chrome.storage.local
            </code>{' '}
            — local to your browser. They never leave your machine.
          </li>
          <li>
            <strong>Your API keys</strong> (Anthropic, Google Gemini, OpenAI) are stored only in{' '}
            <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">
              chrome.storage.local
            </code>
            . They are used directly by your browser to call the provider&apos;s API. Pluck has no
            server in that path.
          </li>
          <li>
            <strong>Your Pluck Pro license</strong> is a signed JWT. We verify it offline using a
            public key bundled in the extension. There is no &quot;phone home&quot; — the extension
            does not contact our server to check your license.
          </li>
        </ul>

        <h2 className="mt-12 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          What Pluck sends to third parties
        </h2>
        <p>When you run a pattern-inference or scrape, the following happens:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>If you use Chrome built-in AI:</strong> nothing leaves your device. Inference
            runs locally on Gemini Nano.
          </li>
          <li>
            <strong>If you use Anthropic, Gemini, or OpenAI (BYOK):</strong> the relevant page
            HTML snippet and your example picks go directly from your browser to that provider&apos;s
            API. Their privacy terms apply.
          </li>
          <li>
            <strong>If you configure a webhook:</strong> your scraped rows go directly to{' '}
            <em>your</em> webhook URL with an HMAC signature header. Nowhere else.
          </li>
        </ul>

        <h2 className="mt-12 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          What our marketing site collects
        </h2>
        <p>
          The landing site at <a href="/" className="underline underline-offset-4">pluck.app</a>{' '}
          uses Vercel for hosting. Vercel logs standard HTTP request metadata (IP, user-agent,
          referrer). We don&apos;t install third-party analytics, tracking pixels, or session
          recorders.
        </p>
        <p>
          The <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">/api/infer</code>{' '}
          endpoint exists for the &quot;try without installing&quot; demo button. It is a mock —
          it returns deterministic fake data and does not call any LLM. Demo requests are rate-limited
          and not retained beyond standard request logs.
        </p>

        <h2 className="mt-12 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          What happens at purchase
        </h2>
        <p>
          When you buy Pluck Pro via Polar.sh, Polar collects your email and payment details under{' '}
          <a
            href="https://polar.sh/legal/privacy"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            their privacy policy
          </a>
          . Polar then sends a signed webhook to our server with your email; we mint your license,
          and email it to you via{' '}
          <a
            href="https://resend.com/legal/privacy-policy"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            Resend
          </a>
          . We do not retain your email or license server-side beyond what the webhook handler
          needs to do its job.
        </p>

        <h2 className="mt-12 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Chrome Web Store permissions explained
        </h2>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>activeTab</strong> and <strong>scripting</strong>: the picker overlay needs to
            inject UI into the page you&apos;re looking at when you click &quot;Start picker&quot;.
          </li>
          <li>
            <strong>storage</strong>: saved jobs, settings, and your API keys live here.
          </li>
          <li>
            <strong>alarms</strong>: the scheduling feature uses Chrome alarms to fire re-runs on
            an interval.
          </li>
          <li>
            <strong>tabs</strong>: re-running a saved job opens a hidden tab to extract data, then
            closes it.
          </li>
          <li>
            <strong>host_permissions: &lt;all_urls&gt;</strong>: the picker has to work on any site
            you choose to use it on, so we request broad host access. Pluck only touches a tab when
            you explicitly start a picker or run a job.
          </li>
        </ul>

        <h2 className="mt-12 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Data retention and deletion
        </h2>
        <p>
          To delete everything Pluck knows about you locally: uninstall the extension. Chrome wipes
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">
            {' '}
            chrome.storage.local{' '}
          </code>
          on uninstall.
        </p>
        <p>
          To delete the email + license record on our side: email{' '}
          <a href="mailto:privacy@pluck.app" className="underline underline-offset-4">
            privacy@pluck.app
          </a>{' '}
          from the address you bought with. We process within 30 days.
        </p>

        <h2 className="mt-12 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Contact
        </h2>
        <p>
          Questions, concerns, or data-deletion requests:{' '}
          <a href="mailto:privacy@pluck.app" className="underline underline-offset-4">
            privacy@pluck.app
          </a>
          .
        </p>
      </section>
    </main>
  );
}
