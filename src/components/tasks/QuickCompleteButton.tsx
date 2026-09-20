import React from 'react';
import { Check } from 'lucide-react';

interface QuickCompleteButtonProps {
  isCompleted: boolean;
  onToggle: () => void;
  ariaLabel?: string;
  size?: 'sm' | 'md';
}

export const QuickCompleteButton: React.FC<QuickCompleteButtonProps> = ({
  isCompleted,
  onToggle,
  ariaLabel = 'Toggle task completion',
  size = 'md',
}) => {
  const boxSize = size === 'sm' ? 'w-4 h-4 rounded-[3px]' : 'w-5 h-5 rounded';
  const iconSize = size === 'sm' ? 'w-3 h-3 stroke-[2.5]' : 'w-3.5 h-3.5 stroke-[2.5]';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`group/btn relative inline-flex items-center justify-center shrink-0 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 ${boxSize} ${
        isCompleted
          ? 'bg-zinc-100 text-zinc-950 border border-zinc-100 hover:bg-zinc-300 hover:border-zinc-300'
          : 'bg-zinc-900/80 border border-zinc-700 hover:border-zinc-400 text-transparent hover:text-zinc-500'
      }`}
    >
      <Check
        className={`${iconSize} transition-opacity duration-100 ${
          isCompleted ? 'opacity-100 text-zinc-950' : 'opacity-0 group-hover/btn:opacity-60 text-zinc-400'
        }`}
      />
    </button>
  );
};
