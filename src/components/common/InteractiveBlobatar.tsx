import React, { useEffect, useMemo, useRef } from 'react';
import { Blobatar } from '@blobatar/react';
import { gaze, type Gaze } from 'blobatar/gaze';
import { idle, poseVars, bakePose } from 'blobatar/expression';

interface InteractiveBlobatarProps {
  name: string;
  size?: number;
  isClosedEyes?: boolean;
  isActiveGaze?: boolean;
  targetFocusElement?: HTMLElement | null;
  targetCoordinates?: { x: number; y: number } | null;
  className?: string;
  hasNotification?: boolean;
}

export const InteractiveBlobatar: React.FC<InteractiveBlobatarProps> = ({
  name,
  size = 96,
  isClosedEyes = false,
  isActiveGaze = true,
  targetFocusElement = null,
  targetCoordinates = null,
  className = '',
  hasNotification = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const driverRef = useRef<Gaze | null>(null);

  const cleanName = useMemo(() => {
    return (name || '').trim() || 'User';
  }, [name]);

  // Gentle lidded peek / partially closed eyes rather than completely flat shut
  const closedExpression = useMemo(
    () => ({
      p: {
        ...idle.p,
        esx: 1.15,
        esy: 0.22,
        edy: 1.8,
        lock: 1,
      },
      vars: poseVars,
      bake: bakePose,
    }),
    []
  );

  // Initialize integrated gaze driver directly on rendered SVGSVGElement (React 18 compatible)
  useEffect(() => {
    if (!containerRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    svg.style.setProperty('--mo-track-travel', '3.5px');
    const driver = gaze(svg as SVGSVGElement, { target: 'pointer' });
    driverRef.current = driver;

    return () => {
      driver.stop();
      driverRef.current = null;
      svg.style.removeProperty('--mo-track-travel');
    };
  }, [cleanName]);

  // Manage target gaze: caret coordinates > focused element > mouse pointer > resting
  useEffect(() => {
    const driver = driverRef.current;
    if (!driver) return;

    if (isClosedEyes || !isActiveGaze) {
      driver.lookAt('rest');
      return;
    }

    if (targetCoordinates && typeof targetCoordinates.x === 'number' && typeof targetCoordinates.y === 'number') {
      driver.lookAt({ x: targetCoordinates.x, y: targetCoordinates.y });
      return;
    }

    if (targetFocusElement) {
      driver.lookAt(targetFocusElement);
      return;
    }

    // Default: follow visitor mouse pointer
    driver.lookAt('pointer');
  }, [isClosedEyes, isActiveGaze, targetCoordinates, targetFocusElement]);

  // Re-measure geometry when size changes
  useEffect(() => {
    driverRef.current?.remeasure();
  }, [size]);

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size }}
      className={`relative select-none inline-flex items-center justify-center shrink-0 ${className}`}
    >
      <Blobatar
        name={cleanName}
        animate="always"
        size={size}
        expression={isClosedEyes ? closedExpression : undefined}
        className="w-full h-full overflow-visible transition-transform duration-200 scale-[1.18]"
      />
      {/* Official Blobatar notification indicator positioned at top-right corner */}
      {hasNotification && (
        <span
          aria-hidden="true"
          className="absolute top-0 right-0 h-[26%] w-[26%] min-w-[7px] min-h-[7px] max-w-[10px] max-h-[10px] rounded-full bg-amber-400 ring-2 ring-zinc-950 pointer-events-none"
        />
      )}
    </div>
  );
};
