import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pluck — visual web scraper for non-coders',
  description:
    'Click anything on any page, get a clean table. AI infers selectors. Free with Chrome built-in AI. $29 lifetime Pro license.',
  openGraph: {
    title: 'Pluck — visual web scraper',
    description: 'Click anything on any page, get a clean table. No selectors, no code.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#050507] text-neutral-100 antialiased selection:bg-indigo-500/40 selection:text-white">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#050507]/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="group flex items-center gap-2 text-sm font-bold tracking-tight text-white">
          <span className="text-base transition-transform group-hover:rotate-12">🍒</span>
          <span>Pluck</span>
          <span className="ml-1 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-neutral-500">
            v0.0.1
          </span>
        </Link>
        <div className="flex items-center gap-1 text-sm">
          <NavLink href="/pricing">Pricing</NavLink>
          <NavLink href="/faq">FAQ</NavLink>
          <NavLink href="https://github.com/ErnestKostevich/Project-3" external>
            GitHub
          </NavLink>
          <a
            href="/#install"
            className="ml-3 rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-neutral-900 transition-all hover:scale-[1.03]"
          >
            Install
          </a>
        </div>
      </nav>
    </header>
  );
}

function NavLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const cls = 'rounded-md px-3 py-1.5 text-neutral-400 transition-colors hover:text-white';
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-8 px-6">
        <div>
          <div className="flex items-center gap-2 font-semibold text-white">
            <span>🍒</span> Pluck
          </div>
          <p className="mt-3 max-w-xs text-sm text-neutral-500">
            Visual web scraping for non-coders. Built solo, shipped fast.
          </p>
          <p className="mt-6 font-mono text-xs text-neutral-700">
            © {new Date().getFullYear()} · v0.0.1
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm sm:grid-cols-3">
          <FooterCol title="Product">
            <FooterLink href="/pricing">Pricing</FooterLink>
            <FooterLink href="/faq">FAQ</FooterLink>
            <FooterLink href="/checkout">Buy Pro</FooterLink>
          </FooterCol>
          <FooterCol title="Resources">
            <FooterLink href="https://github.com/ErnestKostevich/Project-3" external>
              GitHub
            </FooterLink>
            <FooterLink
              href="https://github.com/ErnestKostevich/Project-3/blob/main/docs/SHEETS_SETUP.md"
              external
            >
              Sheets setup
            </FooterLink>
            <FooterLink href="/privacy">Privacy</FooterLink>
          </FooterCol>
          <FooterCol title="Contact">
            <FooterLink href="mailto:hi@pluck.app" external>
              hi@pluck.app
            </FooterLink>
            <FooterLink href="mailto:support@pluck.app" external>
              support@pluck.app
            </FooterLink>
          </FooterCol>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-600">
        {title}
      </div>
      {children}
    </div>
  );
}

function FooterLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const cls = 'text-neutral-400 transition-colors hover:text-white';
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
