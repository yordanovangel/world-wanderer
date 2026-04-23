import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, jsonResponse, verifyAppJwt } from '../_shared/auth.ts';

function nanoToken(len = 10): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const JWT_SECRET = Deno.env.get('JWT_SECRET');
  if (!JWT_SECRET) return jsonResponse({ error: 'Server misconfigured' }, 500);
  const userId = await verifyAppJwt(req.headers.get('Authorization'), JWT_SECRET);
  if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const title: string =
    typeof body?.title === 'string' && body.title.trim().length > 0
      ? body.title.trim().slice(0, 200)
      : 'Безименно приключение';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await supabase
    .from('quests')
    .insert({
      creator_id: userId,
      mode: 'treasure_hunt',
      status: 'draft',
      share_token: nanoToken(10),
      title,
    })
    .select('id, share_token')
    .single();

  if (error || !data) {
    console.error('insert draft', error);
    return jsonResponse({ error: 'Не успяхме да създадем чернова' }, 500);
  }

  return jsonResponse({ quest_id: data.id, share_token: data.share_token });
});
