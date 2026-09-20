import React from 'react';
import { Shield, ArrowLeft, Lock, Database, Trash2 } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';

export const PrivacyPolicyPage: React.FC = () => {
  const { t } = useTranslation();
  const { setActiveModule } = useApp();

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16 animate-fade-in font-sans">
      <button
        type="button"
        onClick={() => setActiveModule('agenda')}
        className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-100 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Workspace</span>
      </button>

      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest">
          <Shield className="w-3.5 h-3.5" />
          <span>Security & Governance</span>
        </div>
        <h1 className="text-2xl font-medium text-zinc-100 tracking-tight mt-1">
          {t.legal.privacyTitle}
        </h1>
        <p className="text-xs text-zinc-400 mt-1 font-mono">
          Last updated: September 2026 • Compliant with GDPR Article 17
        </p>
      </div>

      <div className="space-y-6 text-xs text-zinc-300 leading-relaxed">
        <section className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-zinc-100 font-medium text-sm">
            <Database className="w-4 h-4 text-zinc-400" />
            <h2>1. Data Collection & Purpose</h2>
          </div>
          <p>
            Agenda collects only the essential data necessary to deliver your personal productivity workspace: your email address, display name, client contact cards, project budgets, and task lists. We do not track personal activities outside the application, nor do we sell, rent, or monetize your data with advertising networks.
          </p>
        </section>

        <section className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-zinc-100 font-medium text-sm">
            <Lock className="w-4 h-4 text-zinc-400" />
            <h2>2. Encryption & Intrusion Prevention</h2>
          </div>
          <p>
            All network communication is conducted over TLS 1.3 encrypted connections. Database storage is managed via Supabase with AES-256 encryption at rest. Every database row is safeguarded by PostgreSQL Row Level Security (RLS) policies, guaranteeing that only your verified cryptographic user identifier (auth.uid) can read, insert, modify, or delete your records.
          </p>
        </section>

        <section className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-zinc-100 font-medium text-sm">
            <Trash2 className="w-4 h-4 text-zinc-400" />
            <h2>3. Right to Erasure (Account Deletion)</h2>
          </div>
          <p>
            You retain absolute sovereignty over your records. Under GDPR Article 17, you can permanently delete your account at any time through the Account Settings page. Deleting your account initiates an immediate cascading purge across all relational tables, permanently removing your profile, clients, projects, and tasks from our servers.
          </p>
        </section>

        <section className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-lg space-y-2">
          <h2 className="text-zinc-100 font-medium text-sm">4. Deterministic Avatars (Blobatar.dev)</h2>
          <p>
            Account avatars are generated deterministically using the open-source Blobatar algorithm based on your chosen name. No user images or biometric data are uploaded or processed by external surveillance infrastructure.
          </p>
        </section>
      </div>
    </div>
  );
};
