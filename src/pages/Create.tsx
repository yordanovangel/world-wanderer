import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, Map, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type ModeCardProps = {
  to?: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
  disabled?: boolean;
};

function ModeCard({ to, icon, title, subtitle, badge, disabled }: ModeCardProps) {
  const inner = (
    <div
      className={`flex items-start gap-4 rounded-2xl border border-parchment-200 bg-white p-5 shadow-soft transition-all ${
        disabled ? 'opacity-60' : 'hover:-translate-y-0.5 hover:shadow-card'
      }`}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-terracotta-100 text-terracotta-500">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-[22px] leading-tight text-ink-900">{title}</h2>
          {badge && (
            <span className="rounded-full bg-parchment-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
      </div>
    </div>
  );

  if (disabled || !to) return <div aria-disabled="true">{inner}</div>;
  return (
    <Link to={to} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500 rounded-2xl">
      {inner}
    </Link>
  );
}

export default function CreatePage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
      <Link to="/home" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft size={16} /> {t('common.back')}
      </Link>
      <header className="mt-4">
        <h1 className="font-display text-[28px] leading-tight text-ink-900">{t('create.title')}</h1>
        <p className="mt-1 text-sm text-ink-500">{t('create.subtitle')}</p>
      </header>

      <div className="mt-6 space-y-3">
        <ModeCard to="/create/solo/capture" icon={<Compass size={28} />} title={t('create.solo.title')} subtitle={t('create.solo.desc')} />
        <ModeCard to="/create/multi/capture" icon={<Users size={28} />} title={t('create.multi.title')} subtitle={t('create.multi.desc')} />
        <ModeCard to="/create/treasure/wizard" icon={<Map size={28} />} title={t('create.treasure.title')} subtitle={t('create.treasure.desc')} />
      </div>
    </div>
  );
}
