import React from 'react';
import { ArrowLeft, Compass } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import { InteractiveBlobatar } from './InteractiveBlobatar';

export const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();
  const { setActiveModule } = useApp();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 animate-fade-in">
      <div className="relative mb-6 flex items-center justify-center">
        <InteractiveBlobatar name="404" size={136} />
      </div>

      <div className="space-y-3 max-w-md">
        <div className="font-mono text-xs tracking-widest text-zinc-500 uppercase flex items-center justify-center gap-2">
          <Compass className="w-3.5 h-3.5 text-zinc-400" />
          <span>Error 404</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-semibold text-zinc-100 tracking-tight font-mono">
          {t.notFound.title}
        </h1>

        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-mono">
          {t.notFound.subtitle}
        </p>
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={() => setActiveModule('agenda')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-medium text-xs font-mono uppercase tracking-wider rounded transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.notFound.returnHome}</span>
        </button>
      </div>
    </div>
  );
};
