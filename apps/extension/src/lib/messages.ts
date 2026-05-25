/**
 * Typed message contracts between popup / content script / background.
 * Use a tagged-union pattern so handlers can switch on `type`.
 */

import type { InferRequest, InferResponse } from '@pluck/shared';

/** Sent from popup → content script (via chrome.tabs.sendMessage). */
export type PopupToContentMessage = { type: 'start-picker' } | { type: 'stop-picker' };

/** Sent from content script → background (chrome.runtime.sendMessage). */
export type ContentToBgMessage =
  | { type: 'infer'; payload: InferRequest }
  | { type: 'picker-cancelled' };

/** Background → content script reply for `infer`. */
export type BgInferReply =
  | { ok: true; data: InferResponse }
  | { ok: false; error: string };
