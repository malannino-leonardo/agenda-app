import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  X,
  Eye,
  Pencil,
  Share2,
  Trash2,
  LogOut,
  MoreHorizontal,
  Users,
  Bell,
  BellOff,
  Check,
  Mail,
  Crosshair,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';
import { Calendar } from '../../types';
import { personName } from '../../lib/calendarUtils';
import { CalendarModal } from './CalendarModal';
import { ShareCalendarModal } from './ShareCalendarModal';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface CalendarSidebarProps {
  onClose?: () => void;
}

export const CalendarSidebar: React.FC<CalendarSidebarProps> = ({ onClose }) => {
  const {
    ownedCalendars,
    sharedCalendars,
    calendars,
    isCalendarVisible,
    toggleCalendarVisibility,
    showAllCalendars,
    showOnlyCalendar,
    hiddenCalendarIds,
    deleteCalendar,
    leaveCalendar,
    pendingInvites,
    acceptInvite,
    declineInvite,
    sharingAvailable,
    remindersEnabled,
    setRemindersEnabled,
    showToast,
    tasks,
  } = useApp();
  const { t } = useTranslation();

  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [calendarToEdit, setCalendarToEdit] = useState<Calendar | null>(null);
  const [shareCalendarId, setShareCalendarId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Calendar | null>(null);
  const [toLeave, setToLeave] = useState<Calendar | null>(null);
  const [busyToken, setBusyToken] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuFor) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuFor(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuFor]);

  const shareCalendar = shareCalendarId ? calendars.find((c) => c.id === shareCalendarId) || null : null;
  const allVisible = hiddenCalendarIds.length === 0;

  const taskCount = (calId: string) => tasks.filter((x) => x.calendar_id === calId && !x.parent_id).length;

  const handleInvite = async (token: string, accept: boolean) => {
    setBusyToken(token);
    try {
      if (accept) {
        await acceptInvite(token);
        showToast(t.cal.inviteAccepted, 'success');
      } else {
        await declineInvite(token);
        showToast(t.cal.inviteDeclined, 'info');
      }
    } catch {
      showToast(t.cal.inviteError, 'error');
    } finally {
      setBusyToken(null);
    }
  };

  const renderRow = (cal: Calendar) => {
    const visible = isCalendarVisible(cal.id);
    const isOwner = cal.role === 'owner';
    const collaborators = (cal.members?.length || 0) + (isOwner ? cal.invites?.length || 0 : 0);
    const owner = cal.owner_profile;

    return (
      <div key={cal.id} className="relative group/cal">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-900/60 transition-colors">
          <button
            type="button"
            onClick={() => toggleCalendarVisibility(cal.id)}
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
            aria-pressed={visible}
            title={visible ? t.cal.hideCalendar : t.cal.showCalendar}
          >
            <span
              className="w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors"
              style={{
                backgroundColor: visible ? cal.color : 'transparent',
                borderColor: cal.color,
              }}
            >
              {visible && <Check className="w-3 h-3 text-white stroke-[3]" />}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block truncate text-xs ${visible ? 'text-zinc-200' : 'text-zinc-500'}`}
              >
                {cal.name}
              </span>
              {!isOwner && owner && (
                <span className="block truncate text-[10px] font-mono text-zinc-500">
                  {personName(owner)}
                </span>
              )}
            </span>
          </button>

          <div className="flex items-center gap-1.5 shrink-0 text-zinc-500">
            {collaborators > 0 && isOwner && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-mono" title={t.cal.sharedWith}>
                <Users className="w-3 h-3" />
                {collaborators}
              </span>
            )}
            {!isOwner && (
              <span
                title={cal.role === 'edit' ? t.cal.canEditHint : t.cal.canViewHint}
                className="inline-flex"
              >
                {cal.role === 'edit' ? <Pencil className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </span>
            )}
            <button
              type="button"
              onClick={() => setMenuFor(menuFor === cal.id ? null : cal.id)}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors md:opacity-0 md:group-hover/cal:opacity-100 focus:opacity-100"
              aria-label={t.cal.calendarOptions}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {menuFor === cal.id && (
          <div
            ref={menuRef}
            className="absolute right-1 top-full mt-0.5 z-30 w-48 bg-zinc-950 border border-zinc-800 rounded-md shadow-2xl py-1 text-xs font-mono animate-dropdown"
          >
            <button
              type="button"
              onClick={() => {
                showOnlyCalendar(cal.id);
                setMenuFor(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 text-left"
            >
              <Crosshair className="w-3.5 h-3.5" />
              {t.cal.showOnlyThis}
            </button>
            {isOwner ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShareCalendarId(cal.id);
                    setMenuFor(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 text-left"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {t.cal.share}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCalendarToEdit(cal);
                    setCalendarModalOpen(true);
                    setMenuFor(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 text-left"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {t.cal.editCalendar}
                </button>
                {!cal.is_default && (
                  <button
                    type="button"
                    onClick={() => {
                      setToDelete(cal);
                      setMenuFor(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-zinc-900 text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t.cal.deleteCalendar}
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShareCalendarId(cal.id);
                    setMenuFor(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 text-left"
                >
                  <Users className="w-3.5 h-3.5" />
                  {t.cal.peopleWithAccess}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setToLeave(cal);
                    setMenuFor(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-zinc-900 text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {t.cal.leaveCalendar}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-full h-full md:h-auto flex flex-col bg-zinc-950 md:bg-zinc-900/40 border-r md:border border-zinc-800 md:rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-850 shrink-0">
        <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-zinc-300">
          {t.cal.calendars}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setCalendarToEdit(null);
              setCalendarModalOpen(true);
            }}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
            title={t.cal.newCalendar}
            aria-label={t.cal.newCalendar}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors md:hidden"
              aria-label={t.common.close}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4 min-h-0">
        {/* Invitations waiting for an answer */}
        {pendingInvites.length > 0 && (
          <section className="space-y-1.5">
            <div className="px-2 text-[10px] font-mono uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
              <Mail className="w-3 h-3" />
              {t.cal.invitations} ({pendingInvites.length})
            </div>
            {pendingInvites.map((inv) => (
              <div
                key={inv.token}
                className="p-2.5 rounded-md bg-indigo-950/30 border border-indigo-500/30 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                    style={{ backgroundColor: inv.color }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs text-zinc-100 truncate">{inv.calendar_name}</div>
                    <div className="text-[10px] font-mono text-zinc-400">
                      {inv.owner_name ? `${inv.owner_name} · ` : ''}
                      {inv.permission === 'edit' ? t.cal.canEdit : t.cal.canView}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={busyToken === inv.token}
                    onClick={() => handleInvite(inv.token, true)}
                    className="flex-1 px-2 py-1 text-[11px] font-mono uppercase tracking-wider bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-semibold rounded transition-colors disabled:opacity-50"
                  >
                    {t.cal.accept}
                  </button>
                  <button
                    type="button"
                    disabled={busyToken === inv.token}
                    onClick={() => handleInvite(inv.token, false)}
                    className="px-2 py-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded transition-colors disabled:opacity-50"
                  >
                    {t.cal.decline}
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="space-y-0.5">
          <div className="px-2 pb-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            {t.cal.myCalendars}
          </div>
          {ownedCalendars.length === 0 ? (
            <div className="px-2 py-2 text-[11px] font-mono text-zinc-600">{t.cal.noCalendars}</div>
          ) : (
            ownedCalendars.map(renderRow)
          )}
        </section>

        {sharedCalendars.length > 0 && (
          <section className="space-y-0.5">
            <div className="px-2 pb-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              {t.cal.sharedWithMe}
            </div>
            {sharedCalendars.map(renderRow)}
          </section>
        )}
      </div>

      <div className="border-t border-zinc-850 p-2 space-y-1 shrink-0">
        {!allVisible && (
          <button
            type="button"
            onClick={showAllCalendars}
            className="w-full px-2 py-1.5 text-[11px] font-mono text-left text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 rounded transition-colors"
          >
            {t.cal.showAll}
          </button>
        )}
        <button
          type="button"
          onClick={() => void setRemindersEnabled(!remindersEnabled)}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] font-mono text-left text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 rounded transition-colors"
          aria-pressed={remindersEnabled}
        >
          {remindersEnabled ? (
            <Bell className="w-3.5 h-3.5 text-indigo-400" />
          ) : (
            <BellOff className="w-3.5 h-3.5" />
          )}
          <span className="flex-1">{t.cal.reminders}</span>
          <span className={remindersEnabled ? 'text-indigo-400' : 'text-zinc-600'}>
            {remindersEnabled ? t.cal.on : t.cal.off}
          </span>
        </button>
        {!sharingAvailable && (
          <p className="px-2 py-1 text-[10px] font-mono text-zinc-600 leading-snug">{t.cal.sharingNeedsCloud}</p>
        )}
      </div>

      <CalendarModal
        isOpen={calendarModalOpen}
        onClose={() => {
          setCalendarModalOpen(false);
          setCalendarToEdit(null);
        }}
        calendarToEdit={calendarToEdit}
      />

      <ShareCalendarModal
        isOpen={Boolean(shareCalendar)}
        onClose={() => setShareCalendarId(null)}
        calendar={shareCalendar}
      />

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        title={t.cal.deleteCalendar}
        message={
          toDelete
            ? t.cal.deleteCalendarConfirm
                .replace('{name}', toDelete.name)
                .replace('{count}', String(taskCount(toDelete.id)))
            : ''
        }
        confirmLabel={t.common.delete}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteCalendar(toDelete.id);
          setToDelete(null);
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(toLeave)}
        title={t.cal.leaveCalendar}
        message={toLeave ? t.cal.leaveCalendarConfirm.replace('{name}', toLeave.name) : ''}
        confirmLabel={t.cal.leave}
        onCancel={() => setToLeave(null)}
        onConfirm={() => {
          if (toLeave) leaveCalendar(toLeave.id);
          setToLeave(null);
        }}
      />
    </aside>
  );
};
