import React, { useState, useEffect } from 'react';
import { X, FolderKanban, Users, AlertCircle } from 'lucide-react';
import { Project, ProjectStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: Project | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  projectToEdit,
}) => {
  const { clients, addProject, updateProject } = useApp();
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState<string>('');
  const [budget, setBudget] = useState<number | ''>(0);
  const [quotedPrice, setQuotedPrice] = useState<number | ''>(0);
  const [invoicedAmount, setInvoicedAmount] = useState<number | ''>(0);
  const [status, setStatus] = useState<ProjectStatus>('in_progress');
  const [deadline, setDeadline] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (projectToEdit) {
      setTitle(projectToEdit.title);
      setDescription(projectToEdit.description || '');
      setClientId(projectToEdit.client_id || '');
      setBudget(projectToEdit.budget);
      setQuotedPrice(projectToEdit.quoted_price);
      setInvoicedAmount(projectToEdit.invoiced_amount);
      setStatus(projectToEdit.status);
      setDeadline(
        projectToEdit.deadline ? projectToEdit.deadline.split('T')[0] : ''
      );
    } else {
      setTitle('');
      setDescription('');
      setClientId('');
      setBudget(0);
      setQuotedPrice(0);
      setInvoicedAmount(0);
      setStatus('in_progress');
      setDeadline('');
    }
    setErrorMsg(null);
  }, [projectToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Project title is required.');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      client_id: clientId ? clientId : null,
      budget: Number(budget) || 0,
      quoted_price: Number(quotedPrice) || 0,
      invoiced_amount: Number(invoicedAmount) || 0,
      status,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
    };

    if (projectToEdit) {
      updateProject(projectToEdit.id, payload);
    } else {
      addProject(payload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 flex flex-col space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-950/50 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
              <FolderKanban className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-zinc-100 font-mono tracking-tight">
              {projectToEdit ? t.projects?.editProject || 'Edit Project' : t.projects?.newProject || 'New Project'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-800/80 rounded text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Project Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-zinc-400 uppercase tracking-wider mb-1.5">
              {t.projects?.projectTitle || 'Project Title'} *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Minimalist Design System & Brand Guidelines"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/80 transition-colors"
            />
          </div>

          <div>
            <label className="block text-zinc-400 uppercase tracking-wider mb-1.5">
              {t.projects?.projectDesc || 'Description'}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Project goals, deliverable milestones, or scope..."
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/80 transition-colors resize-none"
            />
          </div>

          {/* Client Assignment (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-zinc-400 uppercase tracking-wider">
                {t.projects?.client || 'Client'} (Optional)
              </label>
              <span className="text-[10px] text-zinc-500">
                Assign client or leave as internal
              </span>
            </div>
            <div className="relative">
              <Users className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:border-indigo-500/80 transition-colors appearance-none"
              >
                <option value="">{t.projects?.noClient || 'None (Internal Project)'}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Financials Row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-zinc-400 uppercase tracking-wider mb-1.5 text-[10px]">
                {t.projects?.budget || 'Budget'} (€)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={budget}
                onChange={(e) => setBudget(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:border-indigo-500/80 transition-colors"
              />
            </div>
            <div>
              <label className="block text-zinc-400 uppercase tracking-wider mb-1.5 text-[10px]">
                {t.projects?.quotedPrice || 'Quoted'} (€)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={quotedPrice}
                onChange={(e) => setQuotedPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:border-indigo-500/80 transition-colors"
              />
            </div>
            <div>
              <label className="block text-zinc-400 uppercase tracking-wider mb-1.5 text-[10px]">
                {t.projects?.invoicedAmount || 'Invoiced'} (€)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={invoicedAmount}
                onChange={(e) => setInvoicedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:border-indigo-500/80 transition-colors"
              />
            </div>
          </div>

          {/* Status & Deadline Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:border-indigo-500/80 transition-colors"
              >
                <option value="in_progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 uppercase tracking-wider mb-1.5">
                {t.projects?.deadline || 'Deadline'}
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:border-indigo-500/80 transition-colors"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-850">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded transition-colors shadow-sm"
            >
              {projectToEdit ? t.common.save : t.common.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
