import { NavLink } from 'react-router-dom';
import { Compass, MapPlus, Notebook, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export function BottomTabBar() {
  const { t } = useTranslation();
  const tabs = [
    { to: '/home', label: t('tabs.home'), Icon: Compass },
    { to: '/create', label: t('tabs.create'), Icon: MapPlus },
    { to: '/history', label: t('tabs.history'), Icon: Notebook },
    { to: '/profile', label: t('tabs.profile'), Icon: User },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-parchment-200 bg-parchment-50/95 backdrop-blur supports-[backdrop-filter]:bg-parchment-50/80"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label={t('tabs.mainNav')}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-2 pb-2">
        {tabs.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex h-14 min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition-colors',
                  isActive ? 'text-ink-900' : 'text-ink-500 hover:text-ink-700'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.25 : 1.75} aria-hidden />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
