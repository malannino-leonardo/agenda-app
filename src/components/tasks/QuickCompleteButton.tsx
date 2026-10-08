import React from 'react';
import { Check } from 'lucide-react';

interface QuickCompleteButtonProps {
  isCompleted: boolean;
  onToggle: () => void;
  ariaLabel?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export const QuickCompleteButton: React.FC<QuickCompleteButtonProps> = ({
  isCompleted,
  onToggle,
  ariaLabel = 'Toggle task completion',
  size = 'md',
  disabled = false,
}) => {
  const boxSize = size === 'sm' ? 'w-4 h-4 rounded-[3px]' : 'w-5 h-5 rounded';
  const iconSize = size === 'sm' ? 'w-3 h-3 stroke-[2.5]' : 'w-3.5 h-3.5 stroke-[2.5]';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onToggle();
      }}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`task-checkbox group/btn relative inline-flex items-center justify-center shrink-0 transition-all duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed ${boxSize} ${
        isCompleted ? 'is-completed' : ''
      }`}
    >
      <Check
        className={`${iconSize} transition-opacity duration-150 ${
          isCompleted ? 'opacity-100' : 'opacity-0 group-hover/btn:opacity-60'
        }`}
      />
    </button>
  );
};

