import { jwtVerify } from 'https://esm.sh/jose@5.9.4';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-language, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function verifyAppJwt(
  authHeader: string | null,
  secret: string,
): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve the request language preference.
 * Order: explicit body.language → X-Language header → fallback ('bg').
 */
export type Lang = 'bg' | 'en';
export function resolveLang(req: Request, body?: unknown): Lang {
  const fromBody = (body as any)?.language;
  if (fromBody === 'bg' || fromBody === 'en') return fromBody;
  const h = (req.headers.get('x-language') || '').toLowerCase().split('-')[0];
  if (h === 'bg' || h === 'en') return h;
  return 'bg';
}

export function langInstruction(lang: Lang): string {
  return lang === 'en'
    ? 'Respond in English. All natural-language fields must be written in English.'
    : 'Respond in Bulgarian. All natural-language fields must be written in Bulgarian.';
}

/**
 * Localized error messages used across edge functions.
 * Keep this small; for AI-generated content, instruct the model with langInstruction().
 */
export function tErr(lang: Lang, key: string): string {
  const en: Record<string, string> = {
    invalid_json: 'Invalid JSON',
    method_not_allowed: 'Method not allowed',
    server_misconfigured: 'Server misconfigured',
    unauthorized: 'Not authenticated',
    forbidden: 'Forbidden',
    not_found: 'Not found',
    db_error: 'Database error',
    rate_limited: 'Too many attempts. Please wait and try again.',
    bad_credentials: 'Wrong combination — try again',
    invalid_images: 'Invalid images',
    invalid_pin: 'PIN must be 4 digits',
    nickname_too_long: 'Nickname is too long',
    pick_two_distinct: 'Pick two different images',
    images_not_normalized: 'Images must be normalized (a < b)',
    images_missing: 'The images do not exist',
    create_account_failed: 'Failed to create account',
    combination_taken: 'This combination is taken — try a different code or images',
    quest_archived: 'The quest is archived',
    quest_not_found: 'This quest does not exist',
    join_failed: 'Could not join the quest',
    upload_failed: 'Upload failed',
    score_failed: 'Scoring failed',
    ai_unavailable: 'AI service is temporarily unavailable',
    credits_exhausted: 'AI credits exhausted',
    invalid_input: 'Invalid input',
  };
  const bg: Record<string, string> = {
    invalid_json: 'Невалиден JSON',
    method_not_allowed: 'Методът не е разрешен',
    server_misconfigured: 'Сървърът не е конфигуриран',
    unauthorized: 'Не сте удостоверени',
    forbidden: 'Забранено',
    not_found: 'Не е намерено',
    db_error: 'Грешка в базата данни',
    rate_limited: 'Прекалено много опити. Изчакай малко и пробвай отново.',
    bad_credentials: 'Грешна комбинация — опитай отново',
    invalid_images: 'Невалидни картинки',
    invalid_pin: 'PIN-ът трябва да е 4 цифри',
    nickname_too_long: 'Псевдонимът е твърде дълъг',
    pick_two_distinct: 'Избери две различни картинки',
    images_not_normalized: 'Картинките трябва да са нормализирани (a < b)',
    images_missing: 'Картинките не съществуват',
    create_account_failed: 'Грешка при създаване на акаунт',
    combination_taken: 'Тази комбинация е заета — опитай друг код или други картинки',
    quest_archived: 'Quest-ът е архивиран',
    quest_not_found: 'Този quest не съществува',
    join_failed: 'Не успяхме да те присъединим',
    upload_failed: 'Качването се провали',
    score_failed: 'Оценяването се провали',
    ai_unavailable: 'AI услугата е временно недостъпна',
    credits_exhausted: 'AI кредитите са изчерпани',
    invalid_input: 'Невалидни данни',
  };
  return (lang === 'en' ? en : bg)[key] ?? key;
}
