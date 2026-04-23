import { Compass, Map, Users, type LucideProps } from 'lucide-react';

export type QuestMode = 'solo' | 'multiplayer' | 'treasure_hunt';

const ICONS: Record<QuestMode, React.ComponentType<LucideProps>> = {
  solo: Compass,
  multiplayer: Users,
  treasure_hunt: Map,
};

export const MODE_LABEL: Record<QuestMode, string> = {
  solo: 'Соло',
  multiplayer: 'Мултиплейър',
  treasure_hunt: 'Съкровище',
};

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
  return <Icon size={size} className={className} aria-label={MODE_LABEL[mode]} />;
}
