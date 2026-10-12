import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Calendar } from '../../types';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendarToEdit?: Calendar | null;
}

const COLOR_PALETTE = [
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Sky', hex: '#0ea5e9' },
  { name: 'Zinc', hex: '#71717a' },
];

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  calendarToEdit,
}) => {
  const { addCalendar, updateCalendar } = useApp();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (calendarToEdit) {
      setName(calendarToEdit.name);
      setColor(calendarToEdit.color);
      setDescription(calendarToEdit.description || '');
    } else {
      setName('');
      setColor('#6366f1');
      setDescription('');
    }
  }, [calendarToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (calendarToEdit) {
      updateCalendar(calendarToEdit.id, {
        name: name.trim(),
        color,
        description: description.trim() || undefined,
      });
    } else {
      addCalendar({
        name: name.trim(),
        color,
        description: description.trim() || undefined,
      });
    }

    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden animate-modal-pop">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <h3 className="text-xs sm:text-sm font-semibold tracking-wide text-zinc-100 uppercase font-mono">
            {calendarToEdit ? `${t.common.edit} Calendar` : 'New Calendar'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
            aria-label={t.common.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
              Calendar Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Work & Clients, Personal, Family"
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 transition-colors font-mono"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
              Color Theme
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center border ${
                    color === c.hex
                      ? 'scale-110 border-white ring-2 ring-zinc-700'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                  aria-label={c.name}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this calendar is for..."
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 transition-colors resize-none font-mono"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-850">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-mono uppercase tracking-wider bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-semibold rounded transition-colors"
            >
              {calendarToEdit ? t.common.save : t.common.create}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
