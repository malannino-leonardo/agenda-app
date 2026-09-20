import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Project, ProjectStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProject?: Project | null;
  defaultClientId?: string | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  initialProject,
  defaultClientId = null,
}) => {
  const { addProject, updateProject, clients } = useApp();
  const { t } = useTranslation();

  const [title, setTitle] = useState(initialProject?.title || '');
  const [description, setDescription] = useState(initialProject?.description || '');
  const [clientId, setClientId] = useState<string | null>(
    initialProject?.client_id || defaultClientId
  );
  const [budget, setBudget] = useState(initialProject?.budget?.toString() || '0');
  const [quotedPrice, setQuotedPrice] = useState(
    initialProject?.quoted_price?.toString() || '0'
  );
  const [invoicedAmount, setInvoicedAmount] = useState(
    initialProject?.invoiced_amount?.toString() || '0'
  );
  const [status, setStatus] = useState<ProjectStatus>(
    initialProject?.status || 'in_progress'
  );
  const [deadline, setDeadline] = useState(initialProject?.deadline || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (initialProject) {
      updateProject(initialProject.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        client_id: clientId || undefined,
        budget: parseFloat(budget) || 0,
        quoted_price: parseFloat(quotedPrice) || 0,
        invoiced_amount: parseFloat(invoicedAmount) || 0,
        status,
        deadline: deadline || undefined,
      });
    } else {
      addProject({
        title: title.trim(),
        description: description.trim() || undefined,
        client_id: clientId || undefined,
        budget: parseFloat(budget) || 0,
        quoted_price: parseFloat(quotedPrice) || 0,
        invoiced_amount: parseFloat(invoicedAmount) || 0,
        status,
        deadline: deadline || undefined,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase font-mono">
            {initialProject ? t.common.edit : t.freelance.newProject}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              {t.freelance.projects} *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Modern Web Platform Architecture"
              className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              {t.freelance.selectClient}
            </label>
            <select
              value={clientId || ''}
              onChange={(e) => setClientId(e.target.value || null)}
              className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded text-zinc-100 focus:border-zinc-500 transition-colors"
            >
              <option value="">{t.tasks.none}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.company ? `(${c.company})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              {t.common.notes}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deliverables, scope description, tech stack..."
              className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 transition-colors resize-none"
            />
          </div>

          {/* Financials Row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                {t.freelance.quotedPrice} (EUR)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={quotedPrice}
                onChange={(e) => setQuotedPrice(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded text-zinc-100 focus:border-zinc-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                {t.freelance.invoicedAmount} (EUR)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={invoicedAmount}
                onChange={(e) => setInvoicedAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded text-zinc-100 focus:border-zinc-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                {t.freelance.budget} (EUR)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded text-zinc-100 focus:border-zinc-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                {t.common.status}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded text-zinc-100 focus:border-zinc-500 transition-colors"
              >
                <option value="pending">{t.tasks.statusPending}</option>
                <option value="in_progress">{t.tasks.statusInProgress}</option>
                <option value="completed">{t.tasks.statusCompleted}</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                {t.freelance.deadline}
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded text-zinc-100 focus:border-zinc-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-zinc-200"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-mono uppercase tracking-wider bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-semibold rounded"
            >
              {t.common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
