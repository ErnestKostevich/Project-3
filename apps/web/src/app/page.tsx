import Link from 'next/link';
import { PickerDemo } from '@/components/PickerDemo';
import { AnimatedOnScroll } from '@/components/AnimatedOnScroll';
import { AuroraBackground } from '@/components/AuroraBackground';
import { ScrollFillText } from '@/components/ScrollFillText';
import { DataPreview } from '@/components/DataPreview';
import { RotatingWord } from '@/components/RotatingWord';
import { TiltContainer } from '@/components/TiltContainer';

export default function HomePage() {
  return (
    <main className="relative overflow-x-hidden">
      <Hero />
      <ManifestoSection />
      <ProductSection />
      <ForWhoSection />
      <PricingSection />
      <FinalCta />
    </main>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative">
      <AuroraBackground />
      <div className="mx-auto max-w-7xl px-6 pb-12 pt-20 sm:pt-28">
        <AnimatedOnScroll>
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-neutral-300 backdrop-blur">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
              </span>
              v0.0.1 · pre-alpha · free with Chrome built-in AI
            </span>
            <h1 className="mt-7 text-balance text-6xl font-semibold leading-[0.95] tracking-[-0.04em] text-white sm:text-7xl lg:text-8xl">
              Click anything.
              <br />
              <span className="bg-gradient-to-br from-white via-indigo-200 to-fuchsia-300 bg-clip-text text-transparent">
                Get a clean table.
              </span>
            </h1>
            <p className="mx-auto mt-7 max-w-xl text-balance text-lg text-neutral-400">
              Visual web scraping for people who don&apos;t write code. Point at the data, AI infers
              the rest. Runs in your browser. Ships to CSV, Sheets, or your webhook.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#install"
                className="group inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-neutral-900 shadow-[0_8px_30px_-8px_rgba(255,255,255,0.4)] transition-all hover:scale-[1.02] hover:shadow-[0_8px_40px_-8px_rgba(99,102,241,0.5)]"
              >
                Install — free
                <span className="text-neutral-500 transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </a>
              <Link
                href="/pricing"
                className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/[0.06]"
              >
                $29 lifetime
              </Link>
            </div>
            <p className="mt-6 font-mono text-xs text-neutral-600">
              ↓ this is the picker, in real motion
            </p>
          </div>
        </AnimatedOnScroll>

        <div className="mt-12 sm:mt-20">
          <TiltContainer className="mx-auto max-w-5xl" maxTilt={3}>
            <PickerDemo />
          </TiltContainer>
        </div>
      </div>
    </section>
  );
}

// ── Manifesto: the zero-cost statement ──────────────────────────────────────

function ManifestoSection() {
  return (
    <section className="relative py-32 sm:py-48">
      <div className="mx-auto max-w-5xl px-6">
        <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">
          Why this can be $29 forever
        </p>
        <ScrollFillText>
          <h2 className="text-balance text-5xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-7xl">
            Pluck has zero servers in your scrape path. The AI runs on your machine.
            We pay $0 to keep it alive. So you don&apos;t pay us monthly.
          </h2>
        </ScrollFillText>

        <div className="mt-20 grid gap-x-12 gap-y-10 sm:grid-cols-3">
          <Stat n="$0" sub="founder cost / month" />
          <Stat n="100%" sub="of inference runs in your browser" />
          <Stat n="0.5%" sub="payment fee · crypto via NOWPayments" />
        </div>
      </div>
    </section>
  );
}

function Stat({ n, sub }: { n: string; sub: string }) {
  return (
    <AnimatedOnScroll>
      <div className="border-l border-white/10 pl-6">
        <div className="bg-gradient-to-br from-white to-neutral-400 bg-clip-text font-semibold tracking-tight text-transparent text-5xl sm:text-6xl">
          {n}
        </div>
        <div className="mt-2 text-sm text-neutral-400">{sub}</div>
      </div>
    </AnimatedOnScroll>
  );
}

// ── Product: what you get ──────────────────────────────────────────────────

function ProductSection() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <AnimatedOnScroll>
          <div className="mb-16 max-w-3xl">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">
              What you get
            </p>
            <h2 className="text-balance text-5xl font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-6xl">
              A clean table.
              <br />
              <span className="text-neutral-500">Not a brittle script.</span>
            </h2>
            <p className="mt-6 max-w-xl text-neutral-400">
              Click examples, hit save. Re-run any time. Schedule it (Pro). Pipe to Sheets,
              webhooks, or CSV. The AI infers selectors so they survive when sites change.
            </p>
          </div>
        </AnimatedOnScroll>

        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div className="space-y-7">
            <Step
              n="01"
              title="Click examples"
              body="Open any page. Hit Pluck → click 2-3 examples of the data you want."
            />
            <Step
              n="02"
              title="AI infers"
              body="Selectors, columns, pagination. Validated against the live DOM and highlighted in green before you save."
            />
            <Step
              n="03"
              title="Ship it"
              body="Save the job. Re-run manually or on schedule. Export to CSV, Google Sheets, or a signed webhook."
            />
          </div>
          <DataPreview />
        </div>
      </div>
    </section>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <AnimatedOnScroll>
      <div className="group relative">
        <div className="flex items-baseline gap-4">
          <span className="font-mono text-sm text-neutral-600">{n}</span>
          <h3 className="text-2xl font-semibold tracking-tight text-white">{title}</h3>
        </div>
        <p className="mt-2 pl-12 text-neutral-400">{body}</p>
      </div>
    </AnimatedOnScroll>
  );
}

// ── For who: rotating word ─────────────────────────────────────────────────

function ForWhoSection() {
  return (
    <section className="relative py-32 sm:py-48">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">
          For who
        </p>
        <h2 className="text-balance text-5xl font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-7xl">
          Built for{' '}
          <RotatingWord
            words={['recruiters', 'SDRs', 'founders', 'marketers', 'researchers', 'analysts']}
          />
          .
          <br />
          <span className="text-neutral-500">Who need the data this week.</span>
        </h2>
        <p className="mx-auto mt-7 max-w-xl text-neutral-400">
          Existing tools (Octoparse, ParseHub, Apify) were built for engineers — CSS selectors,
          XPath, broken scripts. Pluck is built for the operator who shouldn&apos;t have to learn
          that stack.
        </p>
      </div>
    </section>
  );
}

// ── Pricing teaser ─────────────────────────────────────────────────────────

function PricingSection() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <AnimatedOnScroll>
          <div className="mb-16 max-w-3xl">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">
              Pricing
            </p>
            <h2 className="text-balance text-5xl font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-6xl">
              Pay once.
              <br />
              <span className="text-neutral-500">Use forever.</span>
            </h2>
            <p className="mt-6 max-w-xl text-neutral-400">
              No subscription. No usage cap. Free tier is full-feature, you just bring your own
              AI key.
            </p>
          </div>
        </AnimatedOnScroll>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
          <PriceCard
            title="Free"
            price="$0"
            tagline="Forever, for anyone"
            features={[
              'Unlimited rows · your AI provider',
              'Up to 3 saved jobs',
              'Manual runs',
              'CSV download',
            ]}
            cta={
              <a
                href="https://github.com/ErnestKostevich/Project-3#getting-started"
                target="_blank"
                rel="noreferrer"
                className="block w-full rounded-lg border border-white/15 bg-white/[0.03] px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
              >
                Side-load free
              </a>
            }
          />
          <PriceCard
            highlighted
            title="Pro"
            price="$29"
            tagline="One time. Lifetime."
            features={[
              'Unlimited saved jobs',
              'Scheduled runs (chrome.alarms)',
              'Pagination + infinite scroll',
              'Google Sheets + signed webhooks',
              'All AI providers · priority support',
            ]}
            cta={
              <Link
                href="/checkout"
                className="block w-full rounded-lg bg-white px-4 py-3 text-center text-sm font-semibold text-neutral-900 transition-all hover:scale-[1.01]"
              >
                Buy Pro → $29
              </Link>
            }
          />
        </div>
      </div>
    </section>
  );
}

function PriceCard({
  title,
  price,
  tagline,
  features,
  cta,
  highlighted,
}: {
  title: string;
  price: string;
  tagline: string;
  features: string[];
  cta: React.ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden p-10 ${
        highlighted ? 'bg-neutral-950' : 'bg-neutral-950'
      }`}
    >
      {highlighted && (
        <>
          <div
            aria-hidden
            className="absolute -right-16 -top-24 size-72 rounded-full bg-indigo-500/20 blur-3xl"
          />
          <div className="absolute right-6 top-6 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-indigo-200">
            recommended
          </div>
        </>
      )}
      <div className="relative">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="mt-1 text-sm text-neutral-500">{tagline}</div>
        <div className="mt-8 flex items-baseline gap-1">
          <span className="text-7xl font-semibold tracking-[-0.04em] text-white">{price}</span>
          {price !== '$0' && <span className="text-neutral-500"> usd</span>}
        </div>
        <ul className="mt-10 space-y-3 text-sm text-neutral-300">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-3">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="mt-0.5 size-4 shrink-0 text-emerald-400"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clipRule="evenodd"
                />
              </svg>
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-10">{cta}</div>
      </div>
    </div>
  );
}

// ── Final CTA ──────────────────────────────────────────────────────────────

function FinalCta() {
  return (
    <section id="install" className="relative py-32 sm:py-40">
      <div className="mx-auto max-w-5xl px-6">
        <AnimatedOnScroll>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 p-12 sm:p-20">
            <div
              aria-hidden
              className="absolute -left-32 -top-32 size-[500px] rounded-full opacity-50 blur-3xl"
              style={{
                background:
                  'radial-gradient(circle at center, rgba(99,102,241,0.6), transparent 65%)',
              }}
            />
            <div
              aria-hidden
              className="absolute -right-40 -bottom-40 size-[500px] rounded-full opacity-40 blur-3xl"
              style={{
                background:
                  'radial-gradient(circle at center, rgba(236,72,153,0.5), transparent 65%)',
              }}
            />
            <div className="relative">
              <h2 className="max-w-2xl text-balance text-5xl font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-6xl">
                Stop copying.
                <br />
                <span className="text-neutral-500">Start plucking.</span>
              </h2>
              <p className="mt-6 max-w-lg text-neutral-300">
                Chrome Web Store listing is under review. Side-load the dev build below — same
                code, just one extra click to install.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <a
                  href="https://github.com/ErnestKostevich/Project-3#getting-started"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-neutral-900 transition-all hover:scale-[1.02]"
                >
                  Side-load instructions
                  <span className="text-neutral-500">→</span>
                </a>
                <Link
                  href="/faq"
                  className="inline-flex items-center rounded-lg border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/[0.08]"
                >
                  Read the FAQ
                </Link>
              </div>
            </div>
          </div>
        </AnimatedOnScroll>
      </div>
    </section>
  );
}
