import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ImagePairPicker } from '@/components/auth/ImagePairPicker';
import { PinInput } from '@/components/auth/PinInput';
import { useAuth } from '@/lib/auth-context';
import { normalizeImagePair } from '@/lib/normalize';

export default function RegisterPage() {
  const { register } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = selected.length === 2 && pin.length === 4 && !submitting;

  const onSubmit = async () => {
    if (!ready) return;
    setError(null);
    setSubmitting(true);
    try {
      const { a, b } = normalizeImagePair(selected[0], selected[1]);
      await register({ nickname: nickname.trim() || undefined, img_a_id: a, img_b_id: b, pin });
      const after = sessionStorage.getItem('rq_after_login');
      if (after) {
        sessionStorage.removeItem('rq_after_login');
        navigate(after, { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    } catch (e: any) {
      setError(e?.message || t('auth.register.errorFallback'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-5 pb-10 pt-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft size={16} /> {t('common.back')}
      </Link>

      <header className="mt-4 text-center">
        <h1 className="font-display text-[28px] leading-tight text-ink-900">{t('auth.register.title')}</h1>
        <p className="mt-1 text-sm text-ink-500">{t('auth.register.subtitle')}</p>
      </header>

      <div className="mt-6">
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value.slice(0, 40))}
          placeholder={t('auth.register.nicknamePlaceholder')}
          className="h-12 w-full rounded-xl border border-parchment-200 bg-white px-4 text-base text-ink-900 placeholder:text-ink-300 shadow-soft outline-none focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-500/30"
        />
      </div>

      <section className="mt-5">
        <ImagePairPicker selected={selected} onChange={setSelected} />
      </section>

      <section className="mt-6">
        <p className="mb-2 text-center text-xs uppercase tracking-wider text-ink-500">{t('auth.pinLabel')}</p>
        <PinInput value={pin} onChange={setPin} />
      </section>

      {error && (
        <p className="mt-4 rounded-xl border border-danger-200 bg-danger-200/40 px-4 py-3 text-center text-sm text-danger-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!ready}
        className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-terracotta-500 px-4 text-base font-semibold text-parchment-50 shadow-soft transition-colors hover:bg-terracotta-700 disabled:cursor-not-allowed disabled:bg-parchment-200 disabled:text-ink-300 disabled:shadow-none"
      >
        {submitting ? t('auth.register.submitting') : t('auth.register.submit')}
      </button>

      <Link to="/login" className="mt-3 block text-center text-sm text-forest-700 hover:underline">
        {t('auth.register.haveAccount')}
      </Link>

      <p className="mt-6 text-center text-[11px] text-ink-300">{t('auth.register.noRecovery')}</p>
    </div>
  );
}
