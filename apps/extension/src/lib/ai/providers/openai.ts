/**
 * OpenAI provider — calls the Chat Completions API directly from the
 * extension with the user's BYOK key.
 *
 * Uses response_format: json_object so the model returns valid JSON
 * matching our InferResponse shape.
 *
 * https://platform.openai.com/docs/api-reference/chat
 */

import type { InferRequest, InferResponse } from '@pluck/shared';
import { validateInferResponse } from '@pluck/shared';
import type { AIProvider, AISettings } from '../types';
import { ProviderError } from '../types';
import { SYSTEM_PROMPT, buildFlatPrompt } from '../prompt';

const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

interface OpenAIResponse {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
  error?: { message?: string; type?: string };
}

export function createOpenAIProvider(settings: () => AISettings): AIProvider {
  return {
    meta: {
      id: 'openai',
      label: 'OpenAI (BYOK)',
      description:
        'GPT-4o mini with your OpenAI API key. Cheap per call (~$0.0001 per page) and very reliable JSON output via response_format.',
      requiresApiKey: true,
      apiKeyUrl: 'https://platform.openai.com/api-keys',
    },

    async isAvailable() {
      const key = settings().apiKeys.openai;
      if (!key || !key.startsWith('sk-')) {
        return {
          ok: false,
          reason: 'No OpenAI API key configured. Paste your key in Settings → AI providers.',
        };
      }
      return { ok: true };
    },

    async infer(req: InferRequest): Promise<InferResponse> {
      const key = settings().apiKeys.openai;
      if (!key) throw new ProviderError('openai', 'missing API key');

      const body = {
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildFlatPrompt(req) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 4096,
      };

      let res: Response;
      try {
        res = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify(body),
        });
      } catch (err) {
        throw new ProviderError(
          'openai',
          `network error: ${err instanceof Error ? err.message : String(err)}`,
          err,
        );
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new ProviderError('openai', `HTTP ${res.status}: ${text || res.statusText}`);
      }

      let data: OpenAIResponse;
      try {
        data = (await res.json()) as OpenAIResponse;
      } catch (err) {
        throw new ProviderError('openai', 'failed to parse API response as JSON', err);
      }

      if (data.error) {
        throw new ProviderError('openai', `API error: ${data.error.message ?? 'unknown'}`);
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new ProviderError('openai', 'response had no message content');
      }

      // response_format: json_object should give us pure JSON, but strip code
      // fences defensively in case the API returns them.
      const raw = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        throw new ProviderError(
          'openai',
          `model returned non-JSON: ${raw.slice(0, 200)}…`,
          err,
        );
      }

      try {
        return validateInferResponse(parsed);
      } catch (err) {
        throw new ProviderError(
          'openai',
          `response failed schema validation: ${err instanceof Error ? err.message : String(err)}`,
          err,
        );
      }
    },
  };
}
