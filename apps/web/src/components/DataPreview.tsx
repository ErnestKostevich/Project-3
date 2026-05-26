'use client';

import { motion, useReducedMotion } from 'motion/react';

const ROWS = [
  ['Show HN: Pluck — AI visual scraper', '294', 'pluck.app', 'ernest'],
  ['How we built a $0/mo SaaS', '142', 'pluck.app', 'ernest'],
  ['AI replaces Octoparse for ops teams', '88', 'devto.example', 'jane'],
  ['Inside Pluck\'s zero-cost arch', '67', 'medium.example', 'alex'],
  ['Goodbye XPath, hello LLMs', '203', 'substack.example', 'sam'],
  ['Why we picked crypto-only checkout', '54', 'pluck.app', 'ernest'],
];
const HEADERS = ['title', 'score', 'host', 'author'];

/**
 * Stylized preview of "what you get" — a CSV-shaped extraction result.
 * Looks like a real Google Sheets / spreadsheet UI: cell grid, header row,
 * pulsing cursor on a fresh row.
 */
export function DataPreview() {
  const reduce = useReducedMotion();
  return (
    <div className="relative w-full">
      {/* Faint glow behind the table */}
      <div
        aria-hidden
        className="absolute inset-x-8 -bottom-8 h-32 opacity-50 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(99,102,241,0.4), transparent 70%)',
        }}
      />

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/80 shadow-2xl backdrop-blur"
      >
        {/* Window chrome */}
        <div className="flex items-center justify-between border-b border-white/10 bg-neutral-900/60 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-red-400/70" />
              <span className="size-2.5 rounded-full bg-yellow-400/70" />
              <span className="size-2.5 rounded-full bg-emerald-400/70" />
            </div>
            <span className="ml-3 font-mono text-xs text-neutral-500">
              hn-frontpage-scrape.csv
            </span>
          </div>
          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-400/30">
            ● 6 rows · live
          </span>
        </div>

        {/* Table */}
        <div className="overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-neutral-900/40">
                <th className="w-12 border-r border-white/10 px-3 py-2 text-right font-mono text-[10px] text-neutral-600">
                  #
                </th>
                {HEADERS.map((h) => (
                  <th
                    key={h}
                    className="border-r border-white/10 px-4 py-2 text-left font-mono text-[11px] font-medium uppercase tracking-wider text-neutral-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <motion.tr
                  key={i}
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ delay: 0.3 + i * 0.07, duration: 0.4 }}
                  className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="border-r border-white/10 px-3 py-3 text-right font-mono text-[10px] text-neutral-600">
                    {i + 1}
                  </td>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`border-r border-white/5 px-4 py-3 ${
                        j === 0 ? 'text-neutral-100' : 'font-mono text-neutral-400'
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </motion.tr>
              ))}
              {/* Phantom cursor row to suggest "still pulling more" */}
              <tr>
                <td className="border-r border-white/10 px-3 py-3 text-right font-mono text-[10px] text-neutral-700">
                  7
                </td>
                <td colSpan={4} className="px-4 py-3 text-neutral-500">
                  <motion.span
                    animate={reduce ? {} : { opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                    className="inline-block size-2 rounded-sm bg-indigo-400"
                  />{' '}
                  <span className="text-xs text-neutral-600">
                    Pluck is fetching the next page…
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-white/10 bg-neutral-900/40 px-4 py-2 font-mono text-[10px] text-neutral-500">
          <span>scraped 5.2s ago · next run in 23h 41m</span>
          <span className="flex items-center gap-3">
            <span>→ Google Sheets</span>
            <span>→ webhook</span>
          </span>
        </div>
      </motion.div>
    </div>
  );
}
