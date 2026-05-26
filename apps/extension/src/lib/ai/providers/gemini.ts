/**
 * Google Gemini provider — calls the Generative Language API directly from
 * the extension with the user's BYOK key.
 *
 * Why Gemini matters: Google's API has a meaningful free tier (RPM-limited
 * but unlimited daily for most use cases), so this is the second "truly free
 * for the user" path after Chrome built-in AI. Pluck still pays $0.
 *
 * https://ai.google.dev/api/generate-content
 */

import type { InferRequest, InferResponse } from '@pluck/shared';
import { validateInferResponse } from '@pluck/shared';
import type { AIProvider, AISettings } from '../types';
import { ProviderError } from '../types';
import { SYSTEM_PROMPT, buildFlatPrompt } from '../prompt';

const MODEL = 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  error?: { message?: string; status?: string };
}

export function createGeminiProvider(settings: () => AISettings): AIProvider {
  return {
    meta: {
      id: 'gemini',
      label: 'Google Gemini (BYOK)',
      description:
        'Direct call to Google\'s API with your key. Generous free tier — a separate truly free path next to Chrome built-in AI.',
      requiresApiKey: true,
      apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    },

    async isAvailable() {
      const key = settings().apiKeys.gemini;
      if (!key) {
        return {
          ok: false,
          reason: 'No Gemini API key configured. Paste your key in Settings → AI providers.',
        };
      }
      return { ok: true };
    },

    async infer(req: InferRequest): Promise<InferResponse> {
      const key = settings().apiKeys.gemini;
      if (!key) throw new ProviderError('gemini', 'missing API key');

      const body = {
        contents: [{ parts: [{ text: buildFlatPrompt(req) }] }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          // 4096 covers a generous schema (container + 10+ columns +
          // sample rows). Was 2048 which silently truncated mid-JSON →
          // JSON.parse failed → "model returned non-JSON" error.
          maxOutputTokens: 4096,
        },
      };

      let res: Response;
      try {
        res = await fetch(`${API_URL}?key=${encodeURIComponent(key)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (err) {
        throw new ProviderError(
          'gemini',
          `network error: ${err instanceof Error ? err.message : String(err)}`,
          err,
        );
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new ProviderError('gemini', `HTTP ${res.status}: ${text || res.statusText}`);
      }

      let data: GeminiResponse;
      try {
        data = (await res.json()) as GeminiResponse;
      } catch (err) {
        throw new ProviderError('gemini', 'failed to parse API response as JSON', err);
      }

      if (data.error) {
        throw new ProviderError('gemini', `API error: ${data.error.message ?? 'unknown'}`);
      }

      // Concatenate ALL parts — Gemini splits long output across multiple
      // parts. Taking only parts[0] was clipping JSON mid-string.
      const candidate = data.candidates?.[0];
      if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        // MAX_TOKENS / SAFETY / OTHER — surface clearly instead of silently
        // returning truncated JSON.
        throw new ProviderError(
          'gemini',
          `model stopped early (finishReason=${candidate.finishReason}). Try a simpler page or fewer columns.`,
        );
      }
      const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      if (!text) {
        throw new ProviderError('gemini', 'response had no text content');
      }

      const raw = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        throw new ProviderError(
          'gemini',
          `model returned non-JSON: ${raw.slice(0, 200)}…`,
          err,
        );
      }

      try {
        return validateInferResponse(parsed);
      } catch (err) {
        throw new ProviderError(
          'gemini',
          `response failed schema validation: ${err instanceof Error ? err.message : String(err)}`,
          err,
        );
      }
    },
  };
}
