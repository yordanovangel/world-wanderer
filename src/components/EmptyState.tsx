import { ReactNode } from 'react';
import { CameraOff, Hourglass, Map, WifiOff, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Variant = 'no-quests' | 'camera-denied' | 'network' | 'expired';

const ICONS: Record<Variant, LucideIcon> = {
  'no-quests': Map,
  'camera-denied': CameraOff,
  network: WifiOff,
  expired: Hourglass,
};

const KEY: Record<Variant, { title: string; body: string }> = {
  'no-quests': { title: 'empty.noQuestsTitle', body: 'empty.noQuestsBody' },
  'camera-denied': { title: 'empty.cameraDeniedTitle', body: 'empty.cameraDeniedBody' },
  network: { title: 'empty.networkTitle', body: 'empty.networkBody' },
  expired: { title: 'empty.expiredTitle', body: 'empty.expiredBody' },
};

export function EmptyState({
  variant,
  action,
  className = '',
}: {
  variant: Variant;
  action?: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const Icon = ICONS[variant];
  const k = KEY[variant];
  return (
    <div
      className={`flex flex-col items-center rounded-2xl border border-dashed border-parchment-200 bg-white/60 px-6 py-10 text-center ${className}`}
    >
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-parchment-100 text-forest-700">
        <Icon size={26} strokeWidth={1.6} />
      </span>
      <h3 className="mt-4 font-display text-[18px] text-ink-900">{t(k.title)}</h3>
      <p className="mt-1.5 text-sm text-ink-500">{t(k.body)}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
