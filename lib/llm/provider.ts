import 'server-only';

/**
 * Language model access, behind one interface.
 *
 * Same shape as the ephemeris provider and for the same reason: the model is a
 * detail. Swapping Gemini for another vendor should touch this file and nothing
 * else.
 *
 * The model does no astrology. It receives computed facts and writes prose. Any
 * claim in its output not traceable to those facts is a bug, which is why the
 * panels keep the computed evidence visible underneath it.
 */
export interface AnalysisRequest {
  /** Rules the model must follow. Sent as a system instruction. */
  instruction: string;
  /** The computed facts, already serialised. */
  facts: string;
}

export interface LanguageModel {
  readonly name: string;
  generate(req: AnalysisRequest): Promise<string>;
}

/*
 * Model ids move quickly, so this is configurable - a hardcoded id becomes a 404
 * within months. Set ANALYSIS_MODEL to change it without touching code.
 */
const DEFAULT_MODEL = 'gemini-3.7-flash';

/**
 * Overload and rate-limit responses are temporary by definition, so they are
 * retried rather than surfaced. A 503 from Google means their capacity, not a
 * fault in the request, and handing that to a practitioner mid-consultation as a
 * raw status code helps nobody.
 */
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function geminiModel(apiKey: string, model = DEFAULT_MODEL): LanguageModel {
  return {
    name: `Gemini ${model}`,

    async generate({ instruction, facts }) {
      let lastStatus = 0;
      let lastDetail = '';

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              /* Header rather than a query parameter, so the key stays out of
                 URLs and anything that logs them. */
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: instruction }] },
              contents: [{ role: 'user', parts: [{ text: facts }] }],
              generationConfig: {
                temperature: 0.4,
                /*
                 * Generous, because reasoning tokens are drawn from this same
                 * budget on the 3.x models. A limit sized for the prose alone
                 * truncates the answer mid-sentence.
                 */
                maxOutputTokens: 4000,
                /* Short explanatory pieces, not problems needing deep reasoning.
                   Models predating this field ignore it harmlessly. */
                thinkingConfig: { thinkingLevel: 'low' },
              },
            }),
          },
        );

        if (!res.ok) {
          lastStatus = res.status;
          lastDetail = await res.text().catch(() => '');

          if (RETRYABLE.has(res.status) && attempt < MAX_ATTEMPTS) {
            /* Exponential backoff with jitter, so several clients opening at once
               do not retry in lockstep and deepen the overload. */
            await wait(2 ** attempt * 500 + Math.random() * 400);
            continue;
          }

          throw new Error(errorMessage(res.status, model, lastDetail));
        }

        const data = await res.json();
        const finish = data?.candidates?.[0]?.finishReason;
        const text: string = (data?.candidates?.[0]?.content?.parts ?? [])
          .map((p: { text?: string }) => p.text ?? '')
          .join('')
          .trim();

        /*
         * A truncated answer still contains text, so returning it silently is how
         * half a sentence ends up cached forever. It has to be a failure: the
         * caller must not store it and the practitioner must not be shown it.
         */
        if (finish === 'MAX_TOKENS') {
          throw new Error(
            'The analysis was cut off at the token limit. Raise maxOutputTokens in lib/llm/provider.ts, or set ANALYSIS_MODEL to a model that spends fewer reasoning tokens.',
          );
        }

        if (!text) {
          /* Blocked responses are not a capacity problem and must not be retried
             as one - the identical request would be blocked identically. */
          throw new Error(`Gemini returned no text (finish reason: ${finish ?? 'unknown'}).`);
        }

        return text;
      }

      throw new Error(
        `Gemini returned ${lastStatus} on every attempt. ${lastDetail.slice(0, 200)}`,
      );
    },
  };
}

function errorMessage(status: number, model: string, detail: string): string {
  if (status === 404) {
    return `Model "${model}" was not found. Set ANALYSIS_MODEL to a current one - gemini-3.8-flash or gemini-3.6-flash.`;
  }
  if (status === 503) {
    return `${model} is overloaded at Google's end and did not recover after ${MAX_ATTEMPTS} attempts. Try again shortly, or set ANALYSIS_MODEL to a less busy model such as gemini-3.6-flash.`;
  }
  if (status === 429) {
    return 'Rate limit reached on this API key. The free tier resets after a minute.';
  }
  if (status === 400 && detail.includes('API key')) {
    return 'Gemini rejected the API key. Check GEMINI_API_KEY in .env.local, then restart the dev server.';
  }
  if (status === 400 && detail.includes('thinking')) {
    return 'This model does not accept the thinkingConfig setting. Remove it from generationConfig in lib/llm/provider.ts.';
  }
  return `Gemini returned ${status}. ${detail.slice(0, 300)}`;
}

export function getLanguageModel(): LanguageModel | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return geminiModel(key, process.env.ANALYSIS_MODEL);
}
