import { Outlet, useLocation } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';

const TAB_ROUTES = ['/home', '/create', '/history', '/profile'];

/**
 * AppShell — wraps authenticated routes with the persistent bottom tab bar.
 * Auth gating will be added in a later phase.
 */
export function AppShell() {
  const { pathname } = useLocation();
  const showTabs = TAB_ROUTES.some((p) => pathname === p || pathname.startsWith(p + '/'));

  return (
    <div className="min-h-screen bg-parchment-50 text-ink-700">
      <main className={showTabs ? 'pb-24' : ''}>
        <Outlet />
      </main>
      {showTabs && <BottomTabBar />}
    </div>
  );
}
