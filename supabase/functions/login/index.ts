import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { SignJWT } from 'https://esm.sh/jose@5.9.4';
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PIN_RE = /^\d{4}$/;
const RATE_LIMIT_WINDOW_SEC = 60;
const RATE_LIMIT_MAX_FAILS = 5;
const GENERIC_ERROR = 'Грешна комбинация — опитай отново';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown';
}

async function signToken(userId: string, secret: string) {
  const key = new TextEncoder().encode(secret);
  return await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .setSubject(userId)
    .sign(key);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const JWT_SECRET = Deno.env.get('JWT_SECRET');
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    return json({ error: 'Server misconfigured' }, 500);
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  let { img_a_id, img_b_id, pin } = payload ?? {};
  if (!img_a_id || !img_b_id || !UUID_RE.test(img_a_id) || !UUID_RE.test(img_b_id)) {
    return json({ error: 'Невалидни картинки' }, 400);
  }
  if (!pin || !PIN_RE.test(pin)) {
    return json({ error: 'PIN-ът трябва да е 4 цифри' }, 400);
  }
  // Normalize on the server side too (defense in depth)
  if (img_a_id > img_b_id) {
    [img_a_id, img_b_id] = [img_b_id, img_a_id];
  }
  if (img_a_id === img_b_id) {
    return json({ error: GENERIC_ERROR }, 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const ip = getClientIp(req);

  // Rate limit: count failures from this IP in last RATE_LIMIT_WINDOW_SEC seconds
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_SEC * 1000).toISOString();
  const { count: failCount, error: rlErr } = await supabase
    .from('login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('succeeded', false)
    .gte('attempted_at', since);

  if (rlErr) {
    console.error('rate-limit check', rlErr);
    // Fail open on lookup errors — but log
  } else if ((failCount ?? 0) >= RATE_LIMIT_MAX_FAILS) {
    return json(
      { error: 'Прекалено много опити. Изчакай малко и пробвай отново.' },
      429,
    );
  }

  const recordAttempt = async (succeeded: boolean) => {
    const { error } = await supabase
      .from('login_attempts')
      .insert({ ip, succeeded });
    if (error) console.error('record attempt', error);
  };

  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, nickname, pin_hash')
    .eq('img_a_id', img_a_id)
    .eq('img_b_id', img_b_id)
    .maybeSingle();

  if (userErr) {
    console.error('user lookup', userErr);
    await recordAttempt(false);
    return json({ error: GENERIC_ERROR }, 401);
  }

  if (!user) {
    await recordAttempt(false);
    return json({ error: GENERIC_ERROR }, 401);
  }

  const ok = await bcrypt.compare(pin, user.pin_hash);
  if (!ok) {
    await recordAttempt(false);
    return json({ error: GENERIC_ERROR }, 401);
  }

  await recordAttempt(true);
  await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id);

  const token = await signToken(user.id, JWT_SECRET);
  return json({ token, user_id: user.id, nickname: user.nickname });
});
