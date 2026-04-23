import { ReactNode } from 'react';
import { CameraOff, Hourglass, Map, WifiOff, type LucideIcon } from 'lucide-react';

type Variant = 'no-quests' | 'camera-denied' | 'network' | 'expired';

const VARIANT: Record<Variant, { Icon: LucideIcon; title: string; body: string }> = {
  'no-quests': {
    Icon: Map,
    title: 'Още няма приключения',
    body: 'Натисни „Нов quest", за да започнеш първото си.',
  },
  'camera-denied': {
    Icon: CameraOff,
    title: 'Нямаме достъп до камерата',
    body: 'Разреши камерата от настройките на браузъра, за да направиш снимка.',
  },
  network: {
    Icon: WifiOff,
    title: 'Няма връзка',
    body: 'Провери интернета си и опитай отново.',
  },
  expired: {
    Icon: Hourglass,
    title: 'Quest-ът е изтекъл',
    body: 'Този quest вече не е достъпен. Започни ново приключение.',
  },
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
  const { Icon, title, body } = VARIANT[variant];
  return (
    <div
      className={`flex flex-col items-center rounded-2xl border border-dashed border-parchment-200 bg-white/60 px-6 py-10 text-center ${className}`}
    >
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-parchment-100 text-forest-700">
        <Icon size={26} strokeWidth={1.6} />
      </span>
      <h3 className="mt-4 font-display text-[18px] text-ink-900">{title}</h3>
      <p className="mt-1.5 text-sm text-ink-500">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
