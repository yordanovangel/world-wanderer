/** Pull initials from a nickname for the avatar. */
export function initials(nickname?: string | null): string {
  if (!nickname) return '?';
  const parts = nickname.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

/** Days remaining until ISO date — never negative. */
export function daysRemaining(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/** Format duration in seconds → e.g. "12:34" or "1:02:45". */
export function formatDuration(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec <= 0) return '—';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Compute expires_at = started_at + 5 days (matches DB trigger). */
export function sessionExpiresAt(startedAt: string): string {
  return new Date(new Date(startedAt).getTime() + 5 * 86_400_000).toISOString();
}
