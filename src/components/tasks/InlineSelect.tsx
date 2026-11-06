import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface InlineOption<T extends string> {
  value: T;
  label: string;
  dotClass?: string;
}

interface InlineSelectProps<T extends string> {
  value: T;
  options: InlineOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
  /** Extra text color classes for the trigger label */
  labelClass?: string;
}

/** Compact dropdown rendered in a portal so table rows never clip it. */
export function InlineSelect<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  ariaLabel,
  className = '',
  labelClass = 'text-zinc-300',
}: InlineSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) || options[0];

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuHeight = options.length * 32 + 8;
    const up = rect.bottom + menuHeight > window.innerHeight - 8 && rect.top > menuHeight;
    setPos({ top: up ? rect.top - 4 : rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 168), up });
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={`inline-flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] font-mono hover:bg-zinc-800 disabled:hover:bg-transparent disabled:cursor-default transition-colors ${className}`}
      >
        {current.dotClass && <span className={`w-1.5 h-1.5 rounded-full ${current.dotClass}`} />}
        <span className={labelClass}>{current.label}</span>
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              transform: pos.up ? 'translateY(-100%)' : undefined,
            }}
            className="z-[120] w-40 bg-zinc-950 border border-zinc-800 rounded-md shadow-2xl py-1 animate-dropdown"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  if (opt.value !== value) onChange(opt.value);
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono text-left hover:bg-zinc-900 transition-colors ${
                  opt.value === value ? 'text-zinc-100' : 'text-zinc-400'
                }`}
              >
                {opt.dotClass ? (
                  <span className={`w-1.5 h-1.5 rounded-full ${opt.dotClass}`} />
                ) : (
                  <span className="w-1.5" />
                )}
                {opt.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
