/**
 * AI provider factory + selection.
 *
 * Callers use `runInference(req)` and don't need to know which provider answers.
 * Provider selection priority:
 *   1. The user's chosen provider in settings (if available).
 *   2. The first available fallback in PRIORITY order.
 *   3. Throws — UI surfaces the error to the user.
 */

import type { InferRequest, InferResponse } from '@pluck/shared';
import { getSettings } from '../settings';
import type { AIProvider, AISettings, ProviderId } from './types';
import { ChromeBuiltinProvider } from './providers/chrome-builtin';
import { createAnthropicProvider } from './providers/anthropic';
import { createGeminiProvider } from './providers/gemini';
import { createOpenAIProvider } from './providers/openai';

/** Fallback order when the chosen provider isn't available. */
const PRIORITY: ProviderId[] = ['chrome-builtin', 'anthropic', 'gemini', 'openai'];

function getProvider(id: ProviderId, settings: AISettings): AIProvider {
  switch (id) {
    case 'chrome-builtin':
      return ChromeBuiltinProvider;
    case 'anthropic':
      return createAnthropicProvider(() => settings);
    case 'gemini':
      return createGeminiProvider(() => settings);
    case 'openai':
      return createOpenAIProvider(() => settings);
  }
}

export async function runInference(req: InferRequest): Promise<{
  response: InferResponse;
  providerUsed: ProviderId;
}> {
  const settings = await getSettings();

  const chosen = settings.provider;
  const chosenProv = getProvider(chosen, settings);
  const chosenAvail = await chosenProv.isAvailable();
  if (chosenAvail.ok) {
    return { response: await chosenProv.infer(req), providerUsed: chosen };
  }

  const failures: string[] = [`${chosen}: ${chosenAvail.reason}`];

  for (const id of PRIORITY) {
    if (id === chosen) continue;
    const prov = getProvider(id, settings);
    const avail = await prov.isAvailable();
    if (avail.ok) {
      return { response: await prov.infer(req), providerUsed: id };
    }
    failures.push(`${id}: ${avail.reason}`);
  }

  throw new Error(`No AI provider available. Tried:\n  - ${failures.join('\n  - ')}`);
}

export {
  ChromeBuiltinProvider,
  createAnthropicProvider,
  createGeminiProvider,
  createOpenAIProvider,
};
export type { AIProvider, ProviderId, AISettings } from './types';
