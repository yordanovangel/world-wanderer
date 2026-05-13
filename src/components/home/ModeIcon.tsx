import { Compass, Map, Users, type LucideProps } from 'lucide-react';
import i18n from '@/i18n';

export type QuestMode = 'solo' | 'multiplayer' | 'treasure_hunt';

const ICONS: Record<QuestMode, React.ComponentType<LucideProps>> = {
  solo: Compass,
  multiplayer: Users,
  treasure_hunt: Map,
};

/** @deprecated Use t(`mode.${mode}`) instead — kept for compatibility. */
export const MODE_LABEL: Record<QuestMode, string> = new Proxy({} as Record<QuestMode, string>, {
  get: (_target, prop: string) => i18n.t(`mode.${prop}`),
});

export function ModeIcon({
  mode,
  size = 18,
  className,
}: {
  mode: QuestMode;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[mode];
  return <Icon size={size} className={className} aria-label={i18n.t(`mode.${mode}`)} />;
}
