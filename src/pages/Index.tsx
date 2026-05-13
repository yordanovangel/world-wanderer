import { useEffect, useRef, useState } from 'react';
import { Compass } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';
import featureSolo from '@/assets/feature-solo.jpg';
import featureMulti from '@/assets/feature-multi.jpg';
import featureTreasure from '@/assets/feature-treasure.jpg';
import featureJournal from '@/assets/feature-journal.jpg';

const SLIDE_KEYS = ['solo', 'multi', 'treasure', 'journal'] as const;
const SLIDE_IMAGES: Record<(typeof SLIDE_KEYS)[number], string> = {
  solo: featureSolo,
  multi: featureMulti,
  treasure: featureTreasure,
  journal: featureJournal,
};

const Splash = () => {
  const { token, loading } = useAuth();
  const { t } = useTranslation();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let interacted = false;
    const onInteract = () => { interacted = true; };
    el.addEventListener('touchstart', onInteract, { passive: true });
    el.addEventListener('pointerdown', onInteract);

    const id = window.setInterval(() => {
      if (interacted) return;
      const next = (active + 1) % SLIDE_KEYS.length;
      const slide = el.children[next] as HTMLElement | undefined;
      slide?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    }, 4000);

    return () => {
      window.clearInterval(id);
      el.removeEventListener('touchstart', onInteract);
      el.removeEventListener('pointerdown', onInteract);
    };
  }, [active]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      if (idx !== active) setActive(idx);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [active]);

  const goTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const slide = el.children[i] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  };

  if (loading) return null;
  if (token) return <Navigate to="/home" replace />;

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8 rq-grain">
      <div className="w-full pt-6 text-center animate-fade-slide-up">
        <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta-500 text-parchment-50 shadow-card">
          <Compass size={28} strokeWidth={2} />
        </div>
        <h1 className="font-display text-4xl leading-tight text-ink-900">Reality Quest</h1>
        <p className="mt-2 px-4 text-base text-ink-500">{t('splash.tagline')}</p>
      </div>

      <section aria-label={t('splash.whatAwaits')} className="my-7 flex-1">
        <p className="mb-3 text-center font-mono-rq text-[11px] uppercase tracking-[0.18em] text-ink-300">
          {t('splash.whatAwaits')}
        </p>

        <div
          ref={scrollerRef}
          className="-mx-6 flex snap-x snap-mandatory overflow-x-auto scroll-smooth px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {SLIDE_KEYS.map((key, i) => {
            const title = t(`splash.slides.${key}.title`);
            const desc = t(`splash.slides.${key}.desc`);
            return (
              <div
                key={key}
                className="w-full flex-none snap-center pr-3 last:pr-0"
                aria-roledescription="slide"
                aria-label={`${i + 1} ${t('common.of')} ${SLIDE_KEYS.length}`}
              >
                <figure className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl">
                  <img
                    src={SLIDE_IMAGES[key]}
                    alt={title}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    className="absolute inset-0 h-full w-full object-cover"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/30 to-transparent" />
                  <figcaption className="absolute inset-x-0 bottom-0 p-5">
                    <span className="inline-block rounded-full bg-terracotta-500/95 px-2.5 py-0.5 font-mono-rq text-[10px] font-semibold uppercase tracking-wider text-parchment-50">
                      {i + 1} {t('common.of')} {SLIDE_KEYS.length}
                    </span>
                    <h2 className="mt-2 font-display text-2xl leading-tight text-parchment-50">{title}</h2>
                    <p className="mt-1 text-sm text-parchment-50/85">{desc}</p>
                  </figcaption>
                </figure>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5" role="tablist">
          {SLIDE_KEYS.map((key, i) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={t('splash.show', { title: t(`splash.slides.${key}.title`) })}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? 'w-6 bg-terracotta-500' : 'w-1.5 bg-ink-900/20'
              }`}
            />
          ))}
        </div>
      </section>

      <div className="w-full space-y-3 pb-2">
        <Link
          to="/register"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-terracotta-500 px-4 text-base font-semibold text-parchment-50 shadow-soft transition-colors hover:bg-terracotta-700"
        >
          {t('splash.start')}
        </Link>
        <Link
          to="/login"
          className="flex h-12 w-full items-center justify-center rounded-xl border border-parchment-200 bg-white px-4 text-base font-semibold text-ink-900 transition-colors hover:bg-parchment-100"
        >
          {t('splash.haveAccount')}
        </Link>
        <p className="pt-1 text-center font-mono-rq text-[11px] uppercase tracking-wider text-ink-300">
          {t('splash.version')}
        </p>
      </div>
    </div>
  );
};

const Index = Splash;
export default Index;
