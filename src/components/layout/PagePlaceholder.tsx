import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PagePlaceholderProps {
  title: string;
  /** Hide the back arrow (e.g. for top-level tab roots). */
  hideBack?: boolean;
  subtitle?: string;
}

export function PagePlaceholder({ title, hideBack, subtitle }: PagePlaceholderProps) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pt-6 animate-fade-slide-up">
      {!hideBack && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-xl text-ink-700 hover:bg-parchment-100"
          aria-label="Назад"
        >
          <ArrowLeft size={22} />
        </button>
      )}
      <header className="mb-3">
        <h1 className="font-display text-3xl leading-tight text-ink-900">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-ink-500">{subtitle}</p>}
      </header>
      <p className="font-mono-rq text-xs uppercase tracking-wider text-ink-500">Очаквайте скоро</p>
    </div>
  );
}
