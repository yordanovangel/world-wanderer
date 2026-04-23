import { Compass, MapPlus, Notebook, User, Sparkles } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';

const Splash = () => {
  const { token, loading } = useAuth();

  if (loading) return null;
  if (token) return <Navigate to="/home" replace />;

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-between px-6 py-10 rq-grain">
      <div className="w-full pt-10 text-center animate-fade-slide-up">
        <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-terracotta-500 text-parchment-50 shadow-card">
          <Compass size={32} strokeWidth={2} />
        </div>
        <h1 className="font-display text-4xl leading-tight text-ink-900">Reality Quest</h1>
        <p className="mt-3 px-4 text-base text-ink-500">
          Изследвай света около теб. Снимай. Открий. Играй.
        </p>
      </div>

      <ul className="my-8 w-full space-y-3">
        <FeatureRow Icon={Sparkles} title="Соло куест" desc="AI създава мисии от твоите снимки." />
        <FeatureRow Icon={User} title="Мултиплейър" desc="До 5 играчи, една карта, едно време." />
        <FeatureRow Icon={MapPlus} title="Търсене на съкровище" desc="Подреди следи. Поведи приятели." />
        <FeatureRow Icon={Notebook} title="Дневник" desc="Спомени от всяко приключение." />
      </ul>

      <div className="w-full space-y-3 pb-2">
        <Link
          to="/register"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-terracotta-500 px-4 text-base font-semibold text-parchment-50 shadow-soft transition-colors hover:bg-terracotta-700"
        >
          Започни приключение
        </Link>
        <Link
          to="/login"
          className="flex h-12 w-full items-center justify-center rounded-xl border border-parchment-200 bg-white px-4 text-base font-semibold text-ink-900 transition-colors hover:bg-parchment-100"
        >
          Вече имам профил
        </Link>
        <p className="pt-2 text-center font-mono-rq text-[11px] uppercase tracking-wider text-ink-300">
          v0.2 · етап 2
        </p>
      </div>
    </div>
  );
};

function FeatureRow({ Icon, title, desc }: { Icon: typeof Compass; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-parchment-200 bg-white/70 p-3 shadow-soft">
      <div className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-parchment-100 text-forest-700">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-ink-900">{title}</p>
        <p className="text-sm text-ink-500">{desc}</p>
      </div>
    </li>
  );
}

const Index = Splash;
export default Index;
