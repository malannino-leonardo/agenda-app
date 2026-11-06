import React, { useEffect, useState } from 'react';
import { CalendarDays, Eye, Pencil, Loader2, AlertCircle, LogIn, UserPlus, Check } from 'lucide-react';
import { useApp, rememberPendingInvite } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { InviteInfo } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabase';

export const InvitePage: React.FC = () => {
  const { inviteToken, getInviteInfo, acceptInvite, declineInvite, setActiveModule, showToast, pendingInvites } =
    useApp();
  const { user, isLoading, openSignIn, openSignUp } = useAuth();
  const { t } = useTranslation();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingInfo(true);
    if (!inviteToken) {
      setInfo({ valid: false, reason: 'invite_invalid' });
      setLoadingInfo(false);
      return;
    }
    getInviteInfo(inviteToken).then((result) => {
      if (cancelled) return;
      setInfo(result);
      setLoadingInfo(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteToken]);

  // Visitors who are not signed in keep the invite until they have an account
  useEffect(() => {
    if (!user && !isLoading && inviteToken && info?.valid) rememberPendingInvite(inviteToken);
  }, [user, isLoading, inviteToken, info?.valid]);

  const errorText = (code: string | undefined): string => {
    switch (code) {
      case 'invite_expired':
        return t.cal.inviteExpired;
      case 'invite_exhausted':
        return t.cal.inviteExhausted;
      case 'invite_email_mismatch':
        return t.cal.inviteWrongEmail;
      case 'sharing_unavailable':
        return t.cal.sharingNeedsCloud;
      default:
        return t.cal.inviteInvalid;
    }
  };

  const handleAccept = async () => {
    if (!inviteToken) return;
    setBusy(true);
    setError(null);
    try {
      await acceptInvite(inviteToken);
      showToast(t.cal.inviteAccepted, 'success');
      setActiveModule('agenda');
    } catch (err) {
      setError(errorText((err as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (!inviteToken) return;
    setBusy(true);
    try {
      // Only email-restricted invites can be dismissed by the invitee; for links this is just "go away"
      if (pendingInvites.some((p) => p.token === inviteToken)) await declineInvite(inviteToken);
    } catch {
      // ignore
    } finally {
      rememberPendingInvite(null);
      setBusy(false);
      setActiveModule(user ? 'agenda' : 'home');
    }
  };

  const loading = loadingInfo || (isLoading && !user);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-2 animate-fade-in">
      <div className="w-full max-w-md bg-zinc-900/40 border border-zinc-800 rounded-lg p-6 space-y-5">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-zinc-500">
          <CalendarDays className="w-3.5 h-3.5" />
          {t.cal.calendarInvitation}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 py-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t.common.loading}
          </div>
        ) : !isSupabaseConfigured ? (
          <p className="text-xs font-mono text-zinc-400 leading-relaxed">{t.cal.sharingNeedsCloud}</p>
        ) : !info?.valid ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 text-rose-300 text-xs font-mono leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorText(info?.reason)}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveModule(user ? 'agenda' : 'home')}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors"
            >
              {t.cal.goToApp}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <span
                className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                style={{ backgroundColor: info.color || '#6366f1' }}
              />
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-zinc-100 tracking-tight break-words">
                  {info.calendar_name}
                </h1>
                <p className="text-xs font-mono text-zinc-400 mt-1 leading-relaxed">
                  {info.owner_name
                    ? t.cal.invitedBy.replace('{name}', info.owner_name)
                    : t.cal.invitedGeneric}
                </p>
              </div>
            </div>

            <div className="p-3 rounded border border-zinc-800 bg-zinc-950/40 flex items-start gap-2.5 text-xs font-mono text-zinc-300">
              {info.permission === 'edit' ? (
                <Pencil className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              ) : (
                <Eye className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">
                {info.permission === 'edit' ? t.cal.inviteEditDescription : t.cal.inviteViewDescription}
              </span>
            </div>

            {info.restricted && (
              <p className="text-[11px] font-mono text-zinc-500 leading-relaxed">{t.cal.inviteRestrictedHint}</p>
            )}

            {error && (
              <div className="flex items-start gap-2 p-2.5 rounded border border-rose-500/40 bg-rose-950/30 text-rose-300 text-[11px] font-mono">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {user ? (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleAccept}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-mono uppercase tracking-wider bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-semibold rounded transition-colors disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {t.cal.acceptInvite}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleDecline}
                  className="px-4 py-2.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded transition-colors disabled:opacity-50"
                >
                  {t.cal.notNow}
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <p className="text-xs font-mono text-zinc-400 leading-relaxed">{t.cal.signInToJoin}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openSignUp}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-mono uppercase tracking-wider bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-semibold rounded transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {t.account.signUp}
                  </button>
                  <button
                    type="button"
                    onClick={openSignIn}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-mono text-zinc-300 border border-zinc-800 hover:border-zinc-600 rounded transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    {t.account.signIn}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
