import React, { useState } from 'react';
import {
  Plus,
  Mail,
  Phone,
  Edit2,
  Trash2,
  Users,
  Briefcase,
  Search,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';
import { Client } from '../../types';
import { ClientModal } from '../freelance/ClientModal';

export const ClientsModule: React.FC = () => {
  const { clients, projects, deleteClient } = useApp();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.company && c.company.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsClientModalOpen(true);
  };

  const handleCreate = () => {
    setEditingClient(null);
    setIsClientModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest">
            <Users className="w-3.5 h-3.5" />
            <span>Directory</span>
          </div>
          <h1 className="text-xl font-medium text-zinc-100 tracking-tight mt-1">
            {t.clients.title}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5 font-mono">
            {t.clients.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono uppercase tracking-wider bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-medium rounded transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{t.clients.newClient}</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients by name, company, email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-900/80 border border-zinc-800 rounded text-zinc-200 placeholder-zinc-500 focus:border-zinc-500 transition-colors font-mono"
          />
        </div>

        <div className="text-xs font-mono text-zinc-500">
          {filteredClients.length} {t.nav.clients.toLowerCase()}
        </div>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-zinc-850 rounded-lg bg-zinc-900/20">
          <Users className="w-8 h-8 text-zinc-600 mx-auto mb-3 stroke-[1.5]" />
          <p className="text-xs font-mono text-zinc-400">{t.clients.noClients}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const clientProjects = projects.filter((p) => p.client_id === client.id);

            return (
              <div
                key={client.id}
                className="p-5 bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800 hover:border-sky-500/30 rounded-lg card-hover flex flex-col justify-between space-y-4 hover:shadow-lg hover:shadow-black/30 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-medium text-zinc-100 group-hover:text-sky-300 transition-colors tracking-tight">
                        {client.name}
                      </h3>
                      {client.company && (
                        <p className="text-xs text-zinc-400 font-mono mt-0.5">
                          {client.company}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(client)}
                        className="p-1.5 text-zinc-500 hover:text-sky-300 hover:bg-zinc-800 rounded transition-colors"
                        title={t.common.edit}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(t.common.confirmDelete)) {
                            deleteClient(client.id);
                          }
                        }}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 rounded transition-colors"
                        title={t.common.delete}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-4 space-y-1.5 text-xs text-zinc-400 font-mono">
                    {client.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <a
                          href={`mailto:${client.email}`}
                          className="hover:text-zinc-200 truncate"
                        >
                          {client.email}
                        </a>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {client.notes && (
                    <p className="mt-3 text-xs text-zinc-400 line-clamp-2 italic">
                      &quot;{client.notes}&quot;
                    </p>
                  )}
                </div>

                {/* Footer Strip */}
                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-3 h-3 text-zinc-500" />
                    <span>
                      {clientProjects.length} {t.freelance.projects.toLowerCase()}
                    </span>
                  </div>

                  {client.hourly_rate ? (
                    <span>
                      {client.hourly_rate} {client.currency}/hr
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Client Modal */}
      <ClientModal
        key={editingClient ? editingClient.id : 'new'}
        isOpen={isClientModalOpen}
        onClose={() => {
          setIsClientModalOpen(false);
          setEditingClient(null);
        }}
        initialClient={editingClient}
      />
    </div>
  );
};
