import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { joinQuest } from '@/lib/queries/multiplayer';

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setError('Невалиден линк');
      return;
    }
    if (!user) {
      // Save the join target and bounce to login
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
  }, [authLoading, user, token, navigate]);

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

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-7 w-7 animate-spin text-terracotta-500" />
      <p className="text-sm text-ink-500">Присъединяваме те…</p>
    </div>
  );
}
