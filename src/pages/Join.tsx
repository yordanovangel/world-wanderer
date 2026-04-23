import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { joinQuest } from '@/lib/queries/multiplayer';
import { lookupShareToken, type ShareTokenLookup } from '@/lib/queries/quests';

const ERROR_MAP: Record<string, string> = {
  not_found: 'Този quest не съществува',
  archived: 'Quest-ът е архивиран',
};

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<ShareTokenLookup | null>(null);
  const [lookupErr, setLookupErr] = useState<string | null>(null);

  // Public lookup of the quest title for the pre-auth hint
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    lookupShareToken(token)
      .then((d) => !cancelled && setLookup(d))
      .catch((e) => {
        if (cancelled) return;
        const msg = String(e?.message ?? '');
        setLookupErr(ERROR_MAP[msg] ?? msg ?? 'Този quest не съществува');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Auth-gated join attempt
  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setError('Невалиден линк');
      return;
    }
    if (lookupErr) {
      setError(lookupErr);
      return;
    }
    if (!user) {
      sessionStorage.setItem('rq_after_login', `/join/${token}`);
      navigate('/login', { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await joinQuest(token);
        if (!cancelled) navigate(result.redirect, { replace: true });
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Не успяхме да те присъединим');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, token, navigate, lookupErr]);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-md px-5 pb-10 pt-10 text-center">
        <h1 className="font-display text-[24px] text-ink-900">Не може да се присъединиш</h1>
        <p className="mt-2 text-sm text-ink-500">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-terracotta-500 px-5 text-sm font-semibold text-parchment-50 shadow-soft hover:bg-terracotta-700"
        >
          Към началото
        </button>
      </div>
    );
  }

  // Pre-auth: user not logged in yet — but the redirect kicks off in the effect.
  // Show a friendly hint card while we wait for the navigation.
  if (!authLoading && !user && lookup) {
    return (
      <div className="mx-auto w-full max-w-md px-5 pb-10 pt-10 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-ochre-500 text-ink-900">
          <MapPin size={22} />
        </span>
        <h1 className="mt-4 font-display text-[24px] text-ink-900">Покана за приключение</h1>
        <p className="mt-3 text-sm text-ink-500">
          След login ще влезеш в quest „{lookup.title}".
        </p>
        <p className="mt-6 inline-flex items-center gap-2 text-sm text-ink-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Пренасочваме те…
        </p>
        <Link to="/login" className="mt-6 block text-sm text-forest-700 hover:underline">
          Към login →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-7 w-7 animate-spin text-terracotta-500" />
      <p className="text-sm text-ink-500">
        {lookup ? `Присъединяваме те към „${lookup.title}"…` : 'Присъединяваме те…'}
      </p>
    </div>
  );
}
