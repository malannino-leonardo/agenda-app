import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Mail,
  Trash2,
  Users,
  Link2,
  Copy,
  Check,
  Share2,
  Send,
  Crown,
  Info,
  Eye,
  Pencil,
} from 'lucide-react';
import { Calendar, CalendarPermission } from '../../types';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';
import { BlobatarAvatar } from '../common/BlobatarAvatar';
import { personName } from '../../lib/calendarUtils';

interface ShareCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendar: Calendar | null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ShareCalendarModal: React.FC<ShareCalendarModalProps> = ({ isOpen, onClose, calendar }) => {
  const {
    sharingAvailable,
    inviteByEmail,
    createInviteLink,
    revokeInvite,
    updateMemberPermission,
    removeMember,
    buildInviteUrl,
    showToast,
    profiles,
    refreshData,
  } = useApp();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [emailPermission, setEmailPermission] = useState<CalendarPermission>('view');
  const [linkPermission, setLinkPermission] = useState<CalendarPermission>('view');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setError(null);
      setCopiedToken(null);
      void refreshData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, calendar?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !calendar) return null;

  const isOwner = calendar.role === 'owner';
  const members = calendar.members || [];
  const emailInvites = (calendar.invites || []).filter((i) => i.email && !i.revoked);
  const linkInvite = (calendar.invites || []).find(
    (i) => !i.email && !i.revoked && i.permission === linkPermission
  );
  const ownerProfile = calendar.owner_profile || (calendar.user_id ? profiles[calendar.user_id] : null);

  const translateError = (err: unknown): string => {
    const code = (err as Error)?.message || '';
    const map: Record<string, string> = {
      already_member: t.cal.errAlreadyMember,
      invalid_email: t.cal.errInvalidEmail,
      forbidden: t.cal.errForbidden,
      sharing_unavailable: t.cal.sharingNeedsCloud,
    };
    return map[code] || t.cal.errGeneric;
  };

  const copy = async (token: string) => {
    const url = buildInviteUrl(token);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for insecure contexts / old browsers
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        // ignore
      }
      document.body.removeChild(ta);
    }
    setCopiedToken(token);
    showToast(t.cal.linkCopied, 'success');
    window.setTimeout(() => setCopiedToken((cur) => (cur === token ? null : cur)), 2000);
  };

  const mailtoFor = (token: string, to: string, permission: CalendarPermission) => {
    const url = buildInviteUrl(token);
    const subject = t.cal.mailSubject.replace('{name}', calendar.name);
    const body = t.cal.mailBody
      .replace('{name}', calendar.name)
      .replace('{access}', permission === 'edit' ? t.cal.canEdit.toLowerCase() : t.cal.canView.toLowerCase())
      .replace('{url}', url);
    return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const nativeShare = async (token: string) => {
    const url = buildInviteUrl(token);
    try {
      await navigator.share({
        title: t.cal.mailSubject.replace('{name}', calendar.name),
        text: t.cal.shareText.replace('{name}', calendar.name),
        url,
      });
    } catch {
      // user cancelled
    }
  };

  const handleInviteByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const clean = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(clean)) {
      setError(t.cal.errInvalidEmail);
      return;
    }
    setBusy(true);
    try {
      const invite = await inviteByEmail(calendar.id, clean, emailPermission);
      setEmail('');
      showToast(t.cal.inviteCreated.replace('{email}', clean), 'success');
      // Open the visitor's mail client with the link prefilled: the invite also shows up in-app on login
      window.open(mailtoFor(invite.token, clean, emailPermission), '_blank');
    } catch (err) {
      setError(translateError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCreateLink = async () => {
    setError(null);
    setBusy(true);
    try {
      await createInviteLink(calendar.id, linkPermission);
    } catch (err) {
      setError(translateError(err));
    } finally {
      setBusy(false);
    }
  };

  const guarded = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(translateError(err));
    }
  };

  const permissionSelect = (
    value: CalendarPermission,
    onChange: (v: CalendarPermission) => void,
    className = ''
  ) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as CalendarPermission)}
      className={`px-2.5 py-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-200 focus:border-zinc-500 transition-colors text-xs ${className}`}
    >
      <option value="view">{t.cal.canView}</option>
      <option value="edit">{t.cal.canEdit}</option>
    </select>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-modal-pop"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: calendar.color }} />
            <h3 className="text-xs sm:text-sm font-semibold tracking-wide text-zinc-100 uppercase font-mono truncate">
              {isOwner ? t.cal.shareTitle.replace('{name}', calendar.name) : calendar.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
            aria-label={t.common.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto flex-1 text-xs font-mono">
          {!sharingAvailable && (
            <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-lg flex items-start gap-2.5 text-amber-300">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">{t.cal.sharingNeedsCloud}</div>
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded border border-rose-500/40 bg-rose-950/30 text-rose-300 text-[11px]">
              {error}
            </div>
          )}

          {isOwner && sharingAvailable && (
            <>
              {/* Invite by email */}
              <form onSubmit={handleInviteByEmail} className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-zinc-400 uppercase tracking-wider text-[11px]">
                  <Mail className="w-3.5 h-3.5" />
                  {t.cal.inviteByEmail}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="collaborator@example.com"
                      className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 transition-colors text-xs"
                    />
                  </div>
                  {permissionSelect(emailPermission, setEmailPermission)}
                  <button
                    type="submit"
                    disabled={busy || !email.trim()}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-semibold uppercase tracking-wider rounded transition-colors text-xs shrink-0 disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {t.cal.invite}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed">{t.cal.inviteByEmailHint}</p>
              </form>

              {/* Invite link */}
              <div className="space-y-2.5 pt-5 border-t border-zinc-850">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-zinc-400 uppercase tracking-wider text-[11px]">
                    <Link2 className="w-3.5 h-3.5" />
                    {t.cal.inviteLink}
                  </div>
                  {permissionSelect(linkPermission, setLinkPermission, "py-1")}
                </div>

                {linkInvite ? (
                  <div className="space-y-2">
                    <div className="flex items-stretch gap-2">
                      <input
                        readOnly
                        value={buildInviteUrl(linkInvite.token)}
                        onFocus={(e) => e.currentTarget.select()}
                        className="flex-1 min-w-0 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-300 text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => copy(linkInvite.token)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded transition-colors shrink-0"
                      >
                        {copiedToken === linkInvite.token ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {copiedToken === linkInvite.token ? t.cal.copied : t.cal.copy}
                      </button>
                      {typeof navigator !== 'undefined' && 'share' in navigator && (
                        <button
                          type="button"
                          onClick={() => nativeShare(linkInvite.token)}
                          className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded transition-colors shrink-0"
                          title={t.cal.share}
                          aria-label={t.cal.share}
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        {linkPermission === 'edit' ? t.cal.linkHintEdit : t.cal.linkHintView}
                      </p>
                      <button
                        type="button"
                        onClick={() => guarded(() => revokeInvite(calendar.id, linkInvite.id))}
                        className="text-[11px] text-rose-400 hover:text-rose-300 underline shrink-0"
                      >
                        {t.cal.disableLink}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleCreateLink}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-zinc-100 rounded transition-colors disabled:opacity-50"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    {linkPermission === 'edit' ? t.cal.createEditLink : t.cal.createViewLink}
                  </button>
                )}
              </div>
            </>
          )}

          {/* People with access */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-zinc-400 text-[11px] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                {t.cal.peopleWithAccess}
              </span>
              <span>{members.length + 1}</span>
            </div>

            <div className="p-2.5 bg-zinc-900/30 border border-zinc-850 rounded flex items-center gap-3">
              <BlobatarAvatar name={personName(ownerProfile) || 'owner'} size={28} />
              <div className="min-w-0 flex-1">
                <span className="text-zinc-200 block truncate">
                  {isOwner ? t.cal.you : personName(ownerProfile) || t.cal.owner}
                </span>
                {ownerProfile?.email && (
                  <span className="text-[10px] text-zinc-500 block truncate">{ownerProfile.email}</span>
                )}
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 uppercase">
                <Crown className="w-3 h-3 text-amber-400" />
                {t.cal.owner}
              </span>
            </div>

            {members.map((m) => (
              <div
                key={m.id}
                className="p-2.5 bg-zinc-900/30 border border-zinc-850 rounded flex items-center gap-3"
              >
                <BlobatarAvatar name={personName(m.profile) || m.user_id} size={28} />
                <div className="min-w-0 flex-1">
                  <span className="text-zinc-200 block truncate">
                    {personName(m.profile) || t.cal.unknownUser}
                  </span>
                  {m.profile?.email && (
                    <span className="text-[10px] text-zinc-500 block truncate">{m.profile.email}</span>
                  )}
                </div>
                {isOwner ? (
                  <>
                    <select
                      value={m.permission}
                      onChange={(e) =>
                        guarded(() => updateMemberPermission(calendar.id, m.id, e.target.value as CalendarPermission))
                      }
                      className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-200 text-[11px]"
                    >
                      <option value="view">{t.cal.canView}</option>
                      <option value="edit">{t.cal.canEdit}</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => guarded(() => removeMember(calendar.id, m.id))}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition-colors shrink-0"
                      title={t.cal.removeAccess}
                      aria-label={t.cal.removeAccess}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 uppercase">
                    {m.permission === 'edit' ? <Pencil className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {m.permission === 'edit' ? t.cal.canEdit : t.cal.canView}
                  </span>
                )}
              </div>
            ))}

            {members.length === 0 && (
              <div className="py-3 text-center text-zinc-600 text-[11px]">{t.cal.noOneElse}</div>
            )}
          </div>

          {/* Pending email invitations */}
          {isOwner && emailInvites.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] uppercase tracking-wider">
                <Send className="w-3.5 h-3.5 text-zinc-500" />
                {t.cal.pendingInvites} ({emailInvites.length})
              </div>
              {emailInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="p-2.5 bg-zinc-900/30 border border-dashed border-zinc-800 rounded flex items-center gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-zinc-200 block truncate">{inv.email}</span>
                    <span className="text-[10px] text-zinc-500">
                      {inv.permission === 'edit' ? t.cal.canEdit : t.cal.canView} · {t.cal.waitingForAnswer}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(inv.token)}
                    className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                    title={t.cal.copyLink}
                    aria-label={t.cal.copyLink}
                  >
                    {copiedToken === inv.token ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <a
                    href={mailtoFor(inv.token, inv.email || '', inv.permission)}
                    className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                    title={t.cal.resendEmail}
                    aria-label={t.cal.resendEmail}
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => guarded(() => revokeInvite(calendar.id, inv.id))}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition-colors"
                    title={t.cal.cancelInvite}
                    aria-label={t.cal.cancelInvite}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Permission legend */}
          <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-lg space-y-1.5 text-[10px] leading-relaxed text-zinc-500">
            <div>
              <span className="text-zinc-300">{t.cal.canView}</span> — {t.cal.legendView}
            </div>
            <div>
              <span className="text-zinc-300">{t.cal.canEdit}</span> — {t.cal.legendEdit}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end px-5 py-3 border-t border-zinc-850 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
