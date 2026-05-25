import { defineContentScript } from 'wxt/sandbox';
import type { PopupToContentMessage, ContentToBgMessage, BgInferReply } from '@/lib/messages';
import { computeDomPath, elementSampleHtml, elementSampleText } from '@/lib/dom-path';
import { sanitizePageHtml } from '@/lib/sanitize-html';
import type { ElementPick, InferResponse } from '@pluck/shared';
import { mountPickerOverlay, type PickerHandle } from '@/picker/overlay';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    let handle: PickerHandle | null = null;

    chrome.runtime.onMessage.addListener((msg: PopupToContentMessage) => {
      if (msg.type === 'start-picker') {
        if (handle) return;
        handle = mountPickerOverlay({
          onInfer: handleInfer,
          onClose: () => {
            handle?.destroy();
            handle = null;
          },
        });
      } else if (msg.type === 'stop-picker') {
        handle?.destroy();
        handle = null;
      }
    });

    async function handleInfer(picks: ElementPick[]): Promise<InferResponse> {
      const payload = {
        url: window.location.href,
        pageHtml: sanitizePageHtml(),
        picks,
      };
      const message: ContentToBgMessage = { type: 'infer', payload };
      return new Promise<InferResponse>((resolve, reject) => {
        chrome.runtime.sendMessage(message, (reply: BgInferReply) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!reply.ok) reject(new Error(reply.error));
          else resolve(reply.data);
        });
      });
    }

    // Re-export DOM helpers for use inside the overlay module (they're already
    // imported there, but also referenced here to keep the bundler happy).
    void computeDomPath;
    void elementSampleHtml;
    void elementSampleText;
  },
});
