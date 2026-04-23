import { useEffect, useRef } from 'react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
};

/**
 * 4 OTP-style boxes for a numeric PIN.
 * Stores its value as a 4-char string (digits only).
 */
export function PinInput({ value, onChange, autoFocus }: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const setDigit = (i: number, d: string) => {
    const cleaned = d.replace(/\D/g, '').slice(0, 1);
    const arr = (value + '    ').slice(0, 4).split('');
    arr[i] = cleaned || ' ';
    const joined = arr.join('').replace(/\s/g, '');
    onChange(joined);
    if (cleaned && i < 3) refs.current[i + 1]?.focus();
  };

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if ((value[i] ?? '') === '' && i > 0) {
        e.preventDefault();
        const arr = value.split('');
        arr.splice(i - 1, 1);
        onChange(arr.join(''));
        refs.current[i - 1]?.focus();
      } else if (value[i]) {
        e.preventDefault();
        const arr = value.split('');
        arr.splice(i, 1);
        onChange(arr.join(''));
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < 3) {
      refs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (digits) {
      e.preventDefault();
      onChange(digits);
      const next = Math.min(digits.length, 3);
      refs.current[next]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-3" onPaste={handlePaste}>
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          className="h-12 w-12 rounded-xl border border-parchment-200 bg-white text-center font-mono-rq text-xl text-ink-900 shadow-soft outline-none transition focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-500/30"
          aria-label={`PIN цифра ${i + 1}`}
        />
      ))}
    </div>
  );
}
