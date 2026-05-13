import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';
import { joinQuest } from '@/lib/queries/multiplayer';
import { lookupShareToken, type ShareTokenLookup } from '@/lib/queries/quests';

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<ShareTokenLookup | null>(null);
  const [lookupErr, setLookupErr] = useState<string | null>(null);

  const ERROR_MAP: Record<string, string> = {
    not_found: t('join.errors.not_found'),
    archived: t('join.errors.archived'),
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    lookupShareToken(token)
      .then((d) => !cancelled && setLookup(d))
      .catch((e) => {
        if (cancelled) return;
        const msg = String(e?.message ?? '');
        setLookupErr(ERROR_MAP[msg] ?? msg ?? t('join.errors.not_found'));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setError(t('join.errors.invalid_link'));
      return;
    }
    if (lookupErr) {
      setError(lookupErr);
      return;
    }
    if (!user) {
      sessionStorage.setItem('rq_after_login', `/join/${token}`);
      navigate('/register', { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await joinQuest(token);
        if (!cancelled) navigate(result.redirect, { replace: true });
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? t('join.errors.fail'));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, token, navigate, lookupErr]);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-md px-5 pb-10 pt-10 text-center">
        <h1 className="font-display text-[24px] text-ink-900">{t('join.cantJoin')}</h1>
        <p className="mt-2 text-sm text-ink-500">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-terracotta-500 px-5 text-sm font-semibold text-parchment-50 shadow-soft hover:bg-terracotta-700"
        >
          {t('join.toHome')}
        </button>
      </div>
    );
  }

  if (!authLoading && !user && lookup) {
    return (
      <div className="mx-auto w-full max-w-md px-5 pb-10 pt-10 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-ochre-500 text-ink-900">
          <MapPin size={22} />
        </span>
        <h1 className="mt-4 font-display text-[24px] text-ink-900">{t('join.invitation')}</h1>
        <p className="mt-3 text-sm text-ink-500">
          {t('join.afterLogin', { title: lookup.title })}
        </p>
        <p className="mt-6 inline-flex items-center gap-2 text-sm text-ink-500">
          <Loader2 className="h-4 w-4 animate-spin" /> {t('join.redirecting')}
        </p>
        <Link to="/login" className="mt-6 block text-sm text-forest-700 hover:underline">
          {t('join.toLogin')}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-7 w-7 animate-spin text-terracotta-500" />
      <p className="text-sm text-ink-500">
        {lookup ? t('join.joiningTo', { title: lookup.title }) : t('join.joining')}
      </p>
    </div>
  );
}
