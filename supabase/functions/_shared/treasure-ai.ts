// Shared helpers for treasure-hunt AI calls (Lovable AI Gateway, Gemini 2.5 Pro).

const AI_MODEL = 'google/gemini-2.5-pro';
const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

const HINT_SYSTEM = `You are designing a treasure hunt clue. The creator has photographed
a specific real-world object/location and described it plainly.

Transform the plain description into an intriguing clue in Bulgarian that:
- Hints at what/where the target is without naming it directly
- Uses evocative language, metaphor, or wordplay
- Is 1-3 sentences
- Does NOT reveal the exact object name`;

const HINT_TOOL = {
  type: 'function',
  function: {
    name: 'create_hint',
    description: 'Return the intriguing Bulgarian clue.',
    parameters: {
      type: 'object',
      properties: {
        hint: { type: 'string', description: 'Bulgarian clue, 1-3 sentences.' },
      },
      required: ['hint'],
      additionalProperties: false,
    },
  },
} as const;

export async function generateHint(
  creatorContext: string,
  opts: { temperature?: number } = {},
): Promise<string> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY missing');

  const body: any = {
    model: AI_MODEL,
    messages: [
      { role: 'system', content: HINT_SYSTEM },
      {
        role: 'user',
        content: `Plain description: ${creatorContext}\n\nUse the create_hint tool.`,
      },
    ],
    tools: [HINT_TOOL],
    tool_choice: { type: 'function', function: { name: 'create_hint' } },
  };
  if (typeof opts.temperature === 'number') body.temperature = opts.temperature;

  const callOnce = async (): Promise<string> => {
    const res = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      const err: any = new Error(`AI gateway ${res.status}`);
      err.status = res.status;
      err.body = t;
      throw err;
    }
    const data = await res.json();
    const argsStr = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsStr) throw new Error('AI returned no tool call');
    const parsed = JSON.parse(argsStr);
    if (typeof parsed?.hint !== 'string' || parsed.hint.trim().length === 0) {
      throw new Error('AI returned malformed hint');
    }
    return parsed.hint.trim().slice(0, 1000);
  };

  try {
    return await callOnce();
  } catch (e: any) {
    if (e?.status === 429 || e?.status === 402) throw e;
    return await callOnce();
  }
}

const COMPARE_SYSTEM = `You are verifying a treasure hunt answer.

REFERENCE photo (the correct answer) is the FIRST image.
SUBMITTED photo (player's guess) is the SECOND image.

ANALYZE both images. Do NOT generate new content.

Determine if the submitted photo depicts the SAME physical object or
location as the reference, allowing for:
- Different angles, distances, zoom
- Different lighting, time of day
- Minor environmental changes (people, weather)

Do NOT accept if:
- Submitted is a screenshot (visible UI, pixel-perfect edges, no natural camera artifacts)
- Submitted looks downloaded from the internet (stock photography style, too perfect, watermarks)
- Submitted is a similar but different object (e.g. a different bench, a different fountain)
- Submitted is a photo of a screen displaying the reference

Use the compare_images tool. user_hint must be in Bulgarian:
- For no-match: gentle nudge towards the right answer without revealing it
- For match: short congratulatory message`;

const COMPARE_TOOL = {
  type: 'function',
  function: {
    name: 'compare_images',
    description: 'Compare reference vs submitted photo for treasure hunt.',
    parameters: {
      type: 'object',
      properties: {
        match: { type: 'boolean' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        fraud_suspected: { type: 'boolean' },
        fraud_reason: { type: ['string', 'null'] },
        user_hint: { type: 'string', description: 'Bulgarian, 1 sentence.' },
      },
      required: ['match', 'confidence', 'fraud_suspected', 'user_hint'],
      additionalProperties: false,
    },
  },
} as const;

export type CompareResult = {
  match: boolean;
  confidence: number;
  fraud_suspected: boolean;
  fraud_reason: string | null;
  user_hint: string;
};

export async function compareImages(
  referenceUrl: string,
  submissionUrl: string,
): Promise<CompareResult> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY missing');

  const body = {
    model: AI_MODEL,
    messages: [
      { role: 'system', content: COMPARE_SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: referenceUrl } },
          { type: 'image_url', image_url: { url: submissionUrl } },
          { type: 'text', text: 'Compare these two images and use the compare_images tool.' },
        ],
      },
    ],
    tools: [COMPARE_TOOL],
    tool_choice: { type: 'function', function: { name: 'compare_images' } },
  };

  const callOnce = async (): Promise<CompareResult> => {
    const res = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      const err: any = new Error(`AI gateway ${res.status}`);
      err.status = res.status;
      err.body = t;
      throw err;
    }
    const data = await res.json();
    const argsStr = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsStr) throw new Error('AI returned no tool call');
    const parsed = JSON.parse(argsStr) as CompareResult;
    if (
      typeof parsed.match !== 'boolean' ||
      typeof parsed.confidence !== 'number' ||
      typeof parsed.user_hint !== 'string'
    ) {
      throw new Error('AI returned malformed compare payload');
    }
    return {
      match: parsed.match,
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
      fraud_suspected: !!parsed.fraud_suspected,
      fraud_reason: parsed.fraud_reason ?? null,
      user_hint: parsed.user_hint.slice(0, 500),
    };
  };

  try {
    return await callOnce();
  } catch (e: any) {
    if (e?.status === 429 || e?.status === 402) throw e;
    return await callOnce();
  }
}
