import React from 'react';
import { FileText, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';

export const TermsOfServicePage: React.FC = () => {
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
          <FileText className="w-3.5 h-3.5" />
          <span>Legal Agreement</span>
        </div>
        <h1 className="text-2xl font-medium text-zinc-100 tracking-tight mt-1">
          {t.legal.termsTitle}
        </h1>
        <p className="text-xs text-zinc-400 mt-1 font-mono">
          Last updated: September 2026
        </p>
      </div>

      <div className="space-y-6 text-xs text-zinc-300 leading-relaxed">
        <section className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-zinc-100 font-medium text-sm">
            <CheckCircle className="w-4 h-4 text-zinc-400" />
            <h2>1. Acceptance of Terms</h2>
          </div>
          <p>
            By accessing or using Agenda, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may refrain from using the software or immediately terminate your account.
          </p>
        </section>

        <section className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-lg space-y-2">
          <h2 className="text-zinc-100 font-medium text-sm">2. User Account & Security</h2>
          <p>
            You are responsible for maintaining the confidentiality of your authentication credentials. Any activity occurring under your account remains your responsibility. You agree to notify us immediately of any unauthorized access or security breach.
          </p>
        </section>

        <section className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-lg space-y-2">
          <h2 className="text-zinc-100 font-medium text-sm">3. Acceptable Use Policy</h2>
          <p>
            You agree not to misuse Agenda, interfere with normal operations, attempt unauthorized access to infrastructure or reverse-engineer backend APIs. The service is provided strictly for task management, client planning, and personal scheduling.
          </p>
        </section>

        <section className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-zinc-100 font-medium text-sm">
            <AlertCircle className="w-4 h-4 text-zinc-400" />
            <h2>4. Limitation of Liability</h2>
          </div>
          <p>
            Agenda is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind. In no event shall Agenda or its contributors be held liable for any indirect, incidental, special, consequential, or punitive damages arising out of your access to or inability to use the service.
          </p>
        </section>
      </div>
    </div>
  );
};
