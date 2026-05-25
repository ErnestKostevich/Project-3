import { defineBackground } from 'wxt/sandbox';
import { API_BASE_URL } from '@/lib/config';
import type { ContentToBgMessage, BgInferReply } from '@/lib/messages';
import type { InferResponse } from '@pluck/shared';

export default defineBackground(() => {
  // Open the popup when the user clicks the extension icon (default behavior;
  // explicit here in case we want to switch to opening a side panel later).
  chrome.action.onClicked?.addListener(() => {
    // No-op: popup is configured via manifest. Hook reserved for future side-panel mode.
  });

  chrome.runtime.onMessage.addListener(
    (msg: ContentToBgMessage, _sender, sendResponse: (reply: BgInferReply) => void) => {
      if (msg.type === 'infer') {
        (async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/infer`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(msg.payload),
            });
            if (!res.ok) {
              const text = await res.text().catch(() => '');
              sendResponse({ ok: false, error: `HTTP ${res.status}: ${text || res.statusText}` });
              return;
            }
            const data = (await res.json()) as InferResponse;
            sendResponse({ ok: true, data });
          } catch (err) {
            sendResponse({
              ok: false,
              error: err instanceof Error ? err.message : 'network error',
            });
          }
        })();
        return true; // async response
      }
      return false;
    },
  );
});
