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
const NICK_MAX = 40;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!JWT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env configuration', {
      hasJwtSecret: !!JWT_SECRET,
      jwtSecretLength: JWT_SECRET?.length ?? 0,
      hasSupabaseUrl: !!SUPABASE_URL,
      hasServiceRoleKey: !!SUPABASE_SERVICE_ROLE_KEY,
    });
    return json({ error: 'Server misconfigured' }, 500);
  }

  if (JWT_SECRET.length < 32) {
    console.warn('JWT_SECRET is shorter than recommended', { jwtSecretLength: JWT_SECRET.length });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const nickname: string | undefined =
    typeof payload?.nickname === 'string' ? payload.nickname.trim() : undefined;
  const img_a_id: string | undefined = payload?.img_a_id;
  const img_b_id: string | undefined = payload?.img_b_id;
  const pin: string | undefined = payload?.pin;

  if (nickname !== undefined && nickname.length > NICK_MAX) {
    return json({ error: 'Псевдонимът е твърде дълъг' }, 400);
  }
  if (!img_a_id || !img_b_id || !UUID_RE.test(img_a_id) || !UUID_RE.test(img_b_id)) {
    return json({ error: 'Невалидни картинки' }, 400);
  }
  if (img_a_id === img_b_id) {
    return json({ error: 'Избери две различни картинки' }, 400);
  }
  if (img_a_id >= img_b_id) {
    return json({ error: 'Картинките трябва да са нормализирани (a < b)' }, 400);
  }
  if (!pin || !PIN_RE.test(pin)) {
    return json({ error: 'PIN-ът трябва да е 4 цифри' }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify both images exist
  const { data: imgs, error: imgErr } = await supabase
    .from('login_images')
    .select('id')
    .in('id', [img_a_id, img_b_id]);
  if (imgErr) {
    console.error('img lookup', imgErr);
    return json({ error: 'Грешка в базата данни' }, 500);
  }
  if (!imgs || imgs.length !== 2) {
    return json({ error: 'Картинките не съществуват' }, 400);
  }

  const pin_hash = await bcrypt.hash(pin, 10);

  const { data: inserted, error: insErr } = await supabase
    .from('users')
    .insert({
      nickname: nickname && nickname.length > 0 ? nickname : null,
      img_a_id,
      img_b_id,
      pin_hash,
    })
    .select('id, nickname')
    .single();

  if (insErr) {
    // Postgres unique violation
    if ((insErr as any).code === '23505') {
      return json(
        { error: 'Тази комбинация е заета — опитай друг код или други картинки' },
        409,
      );
    }
    console.error('insert user', insErr);
    return json({ error: 'Грешка при създаване на акаунт' }, 500);
  }

  const token = await signToken(inserted.id, JWT_SECRET);
  return json({ token, user_id: inserted.id, nickname: inserted.nickname });
});
