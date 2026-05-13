import { useState } from 'react';
import { currentLanguage, setAppLanguage, type AppLanguage } from '@/i18n';
import { cn } from '@/lib/utils';

export function LanguageToggle({ className }: { className?: string }) {
  const [lang, setLang] = useState<AppLanguage>(currentLanguage());
  const change = (next: AppLanguage) => {
    setLang(next);
    setAppLanguage(next);
  };
  return (
    <div className={cn('inline-flex overflow-hidden rounded-lg border border-parchment-200 bg-white/80 backdrop-blur', className)}>
      {(['bg', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => change(l)}
          aria-pressed={lang === l}
          className={`px-2.5 py-1 text-[11px] font-semibold ${lang === l ? 'bg-terracotta-500 text-parchment-50' : 'text-ink-700 hover:bg-parchment-100'}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
