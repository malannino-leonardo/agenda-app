import React, { useMemo } from 'react';
import { blobatar } from 'blobatar';

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
      return blobatar(name || 'User');
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
      className={`overflow-visible shrink-0 flex items-center justify-center select-none [&>svg]:w-full [&>svg]:h-full [&>svg]:scale-[1.18] ${className}`}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
};
