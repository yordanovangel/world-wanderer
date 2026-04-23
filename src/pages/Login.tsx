import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ImagePairPicker } from '@/components/auth/ImagePairPicker';
import { PinInput } from '@/components/auth/PinInput';
import { useAuth } from '@/lib/auth-context';
import { normalizeImagePair } from '@/lib/normalize';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
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
      await login({ img_a_id: a, img_b_id: b, pin });
      navigate('/home', { replace: true });
    } catch (e: any) {
      setError(e?.message || 'Грешка при вход');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-5 pb-10 pt-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft size={16} /> Назад
      </Link>

      <header className="mt-4 text-center">
        <h1 className="font-display text-[28px] leading-tight text-ink-900">
          Влез в експедицията
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Избери двете си картинки и въведи PIN
        </p>
      </header>

      <section className="mt-6">
        <ImagePairPicker selected={selected} onChange={setSelected} />
      </section>

      <section className="mt-6">
        <p className="mb-2 text-center text-xs uppercase tracking-wider text-ink-500">
          Твоят 4-цифрен PIN
        </p>
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
        {submitting ? 'Вход…' : 'Влез'}
      </button>

      <Link
        to="/register"
        className="mt-3 block text-center text-sm text-forest-700 hover:underline"
      >
        Нов играч? Създай акаунт →
      </Link>
    </div>
  );
}
