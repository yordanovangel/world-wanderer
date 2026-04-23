import { useAuth } from '@/lib/auth-context';
import { CheckCircle2, LogOut } from 'lucide-react';

export default function HomePage() {
  const { user, logout } = useAuth();
  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-5 pt-10 text-center">
      <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-700 text-parchment-50 shadow-card">
        <CheckCircle2 size={32} />
      </div>
      <h1 className="font-display text-3xl text-ink-900">Успешен login!</h1>
      <p className="mt-2 text-ink-500">
        Здравей{user?.nickname ? `, ${user.nickname}` : ''}. Таблото ще се появи скоро.
      </p>
      <button
        type="button"
        onClick={logout}
        className="mx-auto mt-8 inline-flex items-center gap-2 rounded-xl border border-parchment-200 bg-white px-4 py-2 text-sm font-medium text-ink-900 shadow-soft hover:bg-parchment-100"
      >
        <LogOut size={16} /> Изход
      </button>
    </div>
  );
}
