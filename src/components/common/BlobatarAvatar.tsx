import React, { useMemo } from 'react';
import { blobatar } from 'blobatar';
import { svgToImageSrc } from '../../lib/security';

interface BlobatarAvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export const BlobatarAvatar: React.FC<BlobatarAvatarProps> = ({
  name,
  size = 32,
  className = '',
}) => {
  const svgMarkup = useMemo(() => {
    try {
      // Rendered through <img src="data:..."> rather than dangerouslySetInnerHTML:
      // an SVG loaded as an image can never execute script or touch the DOM.
      return svgToImageSrc(blobatar(String(name || 'User').slice(0, 200)));
    } catch {
      return null;
    }
  }, [name]);

  if (!svgMarkup) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`overflow-visible shrink-0 flex items-center justify-center select-none ${className}`}
    >
      <img
        src={svgMarkup}
        alt=""
        draggable={false}
        className="w-full h-full scale-[1.18] pointer-events-none"
      />
    </div>
  );
};
