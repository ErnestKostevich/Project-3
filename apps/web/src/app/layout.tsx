import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pluck — AI-powered visual web scraper',
  description:
    'Click anything on any page. Pluck turns it into structured data — no selectors, no code.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        {children}
      </body>
    </html>
  );
}
