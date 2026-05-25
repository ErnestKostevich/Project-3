import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pluck — AI-powered visual web scraper',
  description:
    'Click anything on any page. Pluck turns it into structured data — no selectors, no code. Free with Chrome built-in AI, $29 lifetime for Pro.',
  openGraph: {
    title: 'Pluck — AI-powered visual web scraper',
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
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 text-sm">
        <Link href="/" className="font-bold tracking-tight">
          🍒 Pluck
        </Link>
        <div className="flex items-center gap-6 text-neutral-600 dark:text-neutral-400">
          <Link
            href="/pricing"
            className="hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Pricing
          </Link>
          <Link href="/faq" className="hover:text-neutral-900 dark:hover:text-neutral-100">
            FAQ
          </Link>
          <a
            href="https://github.com/ErnestKostevich/Project-3"
            target="_blank"
            rel="noreferrer"
            className="hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            GitHub
          </a>
          <a
            href="#install"
            className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
          >
            Install
          </a>
        </div>
      </nav>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 py-8 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6">
        <span>© {new Date().getFullYear()} Pluck</span>
        <div className="flex items-center gap-5">
          <Link
            href="/pricing"
            className="hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Pricing
          </Link>
          <Link href="/faq" className="hover:text-neutral-900 dark:hover:text-neutral-100">
            FAQ
          </Link>
          <Link href="/privacy" className="hover:text-neutral-900 dark:hover:text-neutral-100">
            Privacy
          </Link>
          <a
            href="https://github.com/ErnestKostevich/Project-3"
            target="_blank"
            rel="noreferrer"
            className="hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
