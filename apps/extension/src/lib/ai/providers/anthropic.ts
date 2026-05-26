/**
 * Anthropic provider — calls the Messages API directly from the extension
 * with the user's BYOK key. The user pays their own bill.
 *
 * Uses prompt caching to keep refinement iterations cheap: the page HTML
 * (cacheable) and the picks (per-request) are passed as separate content
 * blocks. The first call is paid in full; subsequent refinements pay only
 * for the small picks delta + the cache read.
 *
 * https://docs.anthropic.com/en/api/messages
 * https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
 */

import type { InferRequest, InferResponse } from '@pluck/shared';
import { validateInferResponse } from '@pluck/shared';
import type { AIProvider, AISettings } from '../types';
import { ProviderError } from '../types';
import { SYSTEM_PROMPT, buildPromptParts } from '../prompt';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5'; // good quality / cost balance; tweak as new models land

interface AnthropicMessagesResponse {
  content: Array<{ type: 'text'; text: string }>;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

export function createAnthropicProvider(settings: () => AISettings): AIProvider {
  return {
    meta: {
      id: 'anthropic',
      label: 'Anthropic Claude (BYOK)',
      description:
        'Highest-quality inference. Bring your own Anthropic API key — your bill, not ours. Prompt caching keeps refinement cheap.',
      requiresApiKey: true,
      apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    },

    async isAvailable() {
      const key = settings().apiKeys.anthropic;
      if (!key || !key.startsWith('sk-')) {
        return {
          ok: false,
          reason: 'No Anthropic API key configured. Paste your key in Settings → AI providers.',
        };
      }
      return { ok: true };
    },

    async infer(req: InferRequest): Promise<InferResponse> {
      const key = settings().apiKeys.anthropic;
      if (!key) throw new ProviderError('anthropic', 'missing API key');

      const { pageBlock, picksBlock } = buildPromptParts(req);

      const body = {
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              // Cacheable: same page → reuses the cache on refinement.
              { type: 'text', text: pageBlock, cache_control: { type: 'ephemeral' } },
              // Per-request: the user's picks (changes each iteration).
              { type: 'text', text: picksBlock },
            ],
          },
        ],
      };

      let res: Response;
      try {
        res = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            // Required to call the API from a browser extension.
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify(body),
        });
      } catch (err) {
        throw new ProviderError(
          'anthropic',
          `network error: ${err instanceof Error ? err.message : String(err)}`,
          err,
        );
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new ProviderError('anthropic', `HTTP ${res.status}: ${text || res.statusText}`);
      }

      let data: AnthropicMessagesResponse;
      try {
        data = (await res.json()) as AnthropicMessagesResponse;
      } catch (err) {
        throw new ProviderError('anthropic', 'failed to parse API response as JSON', err);
      }

      const textBlock = data.content.find((c) => c.type === 'text');
      if (!textBlock) {
        throw new ProviderError('anthropic', 'response had no text content');
      }

      const raw = textBlock.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        throw new ProviderError(
          'anthropic',
          `model returned non-JSON: ${raw.slice(0, 200)}…`,
          err,
        );
      }

      try {
        return validateInferResponse(parsed);
      } catch (err) {
        throw new ProviderError(
          'anthropic',
          `response failed schema validation: ${err instanceof Error ? err.message : String(err)}`,
          err,
        );
      }
    },
  };
}
