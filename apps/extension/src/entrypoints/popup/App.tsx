import { useEffect, useState } from 'react';
import type { PopupToContentMessage } from '@/lib/messages';
import { API_BASE_URL } from '@/lib/config';

export function App() {
  const [tabUrl, setTabUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      setTabUrl(tabs[0]?.url ?? '');
    });
  }, []);

  async function startPicker() {
    setError(null);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setError('No active tab.');
      return;
    }
    if (tab.url && /^(chrome|edge|about):/.test(tab.url)) {
      setError('Pluck cannot run on browser internal pages. Open a regular web page.');
      return;
    }
    const message: PopupToContentMessage = { type: 'start-picker' };
    try {
      await chrome.tabs.sendMessage(tab.id, message);
      window.close();
    } catch (err) {
      // Content script may not be injected yet on a fresh tab; try injecting then resend.
      setError(
        `Could not start picker on this tab. Try reloading the page. (${
          err instanceof Error ? err.message : String(err)
        })`,
      );
    }
  }

  return (
    <main>
      <header>
        <span className="brand">🍒 Pluck</span>
        <span className="version">pre-alpha</span>
      </header>

      <section className="hero">
        <h1>Click anything on a page.</h1>
        <p>Pick example data, and Pluck infers the pattern for everything like it.</p>
      </section>

      <button className="primary" onClick={startPicker}>
        Start picker on this tab
      </button>

      {error && <div className="error">{error}</div>}

      <footer>
        <div className="row">
          <span>Active tab:</span>
          <span className="tab-url" title={tabUrl}>
            {tabUrl ? new URL(tabUrl).hostname : '—'}
          </span>
        </div>
        <div className="row">
          <span>API:</span>
          <code>{API_BASE_URL}</code>
        </div>
      </footer>
    </main>
  );
}
