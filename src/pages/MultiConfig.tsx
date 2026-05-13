import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createMultiplayerRoom } from '@/lib/queries/multiplayer';
import { invokeFn } from '@/lib/fn';
import { toast } from '@/hooks/use-toast';

const STORAGE_KEY = 'rq_multi_capture';
const TIME_PRESETS = [5, 10, 15, 30, 60, 120] as const;

export default function MultiConfigPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [minutes, setMinutes] = useState<number>(10);
  const [generating, setGenerating] = useState(false);

  const onGenerate = async () => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      toast({ title: t('multi.missingPhotos'), description: t('multi.missingPhotosDesc'), variant: 'destructive' });
      navigate('/create/multi/capture', { replace: true });
      return;
    }
    let paths: string[] = [];
    try { paths = JSON.parse(raw)?.source_paths ?? []; } catch { paths = []; }
    if (paths.length === 0) {
      toast({ title: t('multi.missingPhotos'), variant: 'destructive' });
      navigate('/create/multi/capture', { replace: true });
      return;
    }

    setGenerating(true);
    try {
      const result = await invokeFn<{ quest_id: string; share_token: string }>('generate-quest', {
        source_paths: paths, mode: 'multiplayer', time_limit_sec: minutes * 60,
      });
      const { room_id } = await createMultiplayerRoom(result.quest_id);
      sessionStorage.removeItem(STORAGE_KEY);
      navigate(`/room/${room_id}/lobby`, { replace: true });
    } catch (e: any) {
      toast({ title: t('multi.createRoomFailed'), description: e?.message, variant: 'destructive' });
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
      <Link to="/create/multi/capture" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft size={16} /> {t('common.back')}
      </Link>

      <header className="mt-4">
        <h1 className="font-display text-[24px] text-ink-900">{t('multi.configTitle')}</h1>
        <p className="mt-1 text-sm text-ink-500">{t('multi.configSubtitle')}</p>
      </header>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {TIME_PRESETS.map((m) => {
          const selected = minutes === m;
          return (
            <button key={m} type="button" onClick={() => setMinutes(m)}
              className={`rounded-xl px-3 py-4 text-center font-semibold shadow-soft transition-colors ${selected ? 'bg-terracotta-500 text-parchment-50' : 'bg-white text-ink-700 hover:bg-parchment-100'}`}>
              <span className="block text-2xl font-display">{m}</span>
              <span className="text-[11px] uppercase tracking-wide opacity-80">{t('common.minutes_short')}</span>
            </button>
          );
        })}
      </div>

      <button type="button" onClick={onGenerate} disabled={generating}
        className="mt-10 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-terracotta-500 px-4 text-base font-semibold text-parchment-50 shadow-soft hover:bg-terracotta-700 disabled:cursor-not-allowed disabled:bg-parchment-200 disabled:text-ink-300 disabled:shadow-none">
        <Sparkles size={18} /> {t('multi.create')}
      </button>

      {generating && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-parchment-50/95 backdrop-blur" role="status">
          <Compass size={64} className="animate-spin text-terracotta-500" style={{ animationDuration: '2.4s' }} />
          <p className="font-display text-2xl text-ink-900">{t('multi.creating')}</p>
        </div>
      )}
    </div>
  );
}
