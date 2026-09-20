import React, { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon,
  Mail,
  Lock,
  Trash2,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { InteractiveBlobatar } from '../common/InteractiveBlobatar';
import { useApp } from '../../context/AppContext';
import { getInputCaretCoordinates } from '../../lib/caret';

export const AccountPage: React.FC = () => {
  const {
    user,
    profile,
    updateProfileName,
    updateEmail,
    changePassword,
    deleteAccount,
    signOut,
    openSignIn,
  } = useAuth();
  const { t } = useTranslation();
  const { setActiveModule } = useApp();

  // Profile Form State
  const [name, setName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(profile?.email || user?.email || '');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Delete Account Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Eye tracking state
  const [caretCoords, setCaretCoords] = useState<{ x: number; y: number } | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name);
    if (profile?.email || user?.email) setEmail(profile?.email || user?.email || '');
  }, [profile, user]);

  const handleInputTracking = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const coords = getInputCaretCoordinates(e.currentTarget);
    setCaretCoords(coords);
  };

  const handleInputBlur = () => {
    setCaretCoords(null);
  };

  // Handle Profile (Name & Email) Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setIsSavingProfile(true);

    try {
      if (name.trim() !== profile?.full_name) {
        const { error } = await updateProfileName(name.trim());
        if (error) throw error;
      }

      if (email.trim() && email.trim() !== (profile?.email || user?.email)) {
        const { error } = await updateEmail(email.trim());
        if (error) throw error;
      }

      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: unknown) {
      setProfileMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update profile.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Please enter your current password.' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await changePassword(currentPassword, newPassword);
      if (error) throw error;

      setPasswordMsg({ type: 'success', text: 'Password successfully updated.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setPasswordMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update password.',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle Account Deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'DELETE') {
      setDeleteMsg("Type 'DELETE' to confirm.");
      return;
    }

    setIsDeleting(true);
    setDeleteMsg(null);

    try {
      const { error } = await deleteAccount();
      if (error) throw error;

      setIsDeleteModalOpen(false);
      setActiveModule('agenda');
    } catch (err: unknown) {
      setDeleteMsg(err instanceof Error ? err.message : 'Failed to delete account.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-6">
        <div className="flex justify-center">
          <InteractiveBlobatar name="Guest" size={104} />
        </div>
        <h2 className="text-xl font-medium text-zinc-100">{t.account.title}</h2>
        <p className="text-xs text-zinc-400 font-mono">
          Sign in to access your profile, sync data securely with Supabase, and customize your account icon.
        </p>
        <button
          type="button"
          onClick={openSignIn}
          className="px-4 py-2 text-xs font-mono uppercase tracking-wider bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-medium rounded transition-colors"
        >
          {t.account.signIn}
        </button>
      </div>
    );
  }

  // Blobatar closes eyes ONLY when password is shown. If password is hidden, eyes stay open!
  const isClosedEyes = showPassword;
  const userSeed = name.trim() || email.split('@')[0] || 'User';

  const memberDate = profile?.created_at || user.created_at;
  const formattedMemberDate = memberDate
    ? new Date(memberDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-medium text-zinc-100 tracking-tight">
          {t.account.title}
        </h1>
        <p className="text-xs text-zinc-400 mt-1 font-mono">
          {t.account.subtitle}
        </p>
      </div>

      {/* Side-by-side Layout: Left Side Personal Info Card + Blobatar, Right Side Settings Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Persistent Personal Info & Live Blobatar */}
        <div className="lg:col-span-4 sticky top-20">
          <div className="p-6 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-6 shadow-xl hover:border-zinc-700/70 transition-colors">
            {/* Centered Avatar that follows cursor at all times */}
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex items-center justify-center">
                <InteractiveBlobatar
                  name={userSeed}
                  size={136}
                  isClosedEyes={isClosedEyes}
                  targetCoordinates={caretCoords}
                  isActiveGaze={true}
                />
              </div>
              <h2 className="text-base font-medium text-zinc-100 truncate max-w-[220px]">
                {name || 'Account'}
              </h2>
              <div className="text-xs font-mono text-zinc-400 flex items-center justify-center gap-1.5 mt-0.5 truncate max-w-[220px]">
                <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="truncate">{email || user.email}</span>
              </div>
            </div>

            {/* Personal Details Metadata */}
            <div className="pt-4 border-t border-zinc-800/80 space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-zinc-500">Status</span>
                <span className="flex items-center gap-1 text-zinc-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Authenticated</span>
                </span>
              </div>

              {formattedMemberDate && (
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-zinc-500">Member Since</span>
                  <span className="flex items-center gap-1 text-zinc-300">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{formattedMemberDate}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Sign Out Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => signOut()}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-mono border border-zinc-800 hover:border-zinc-700 bg-zinc-950 hover:bg-zinc-850 text-zinc-300 hover:text-zinc-100 rounded transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.account.signOut}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Settings Forms */}
        <div className="lg:col-span-8 space-y-8">
          {/* Profile Details Form */}
          <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-6 shadow-sm hover:border-zinc-700/60 transition-colors">
            <div className="border-b border-zinc-800 pb-3 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-medium text-zinc-200 uppercase font-mono tracking-wider">
                {t.account.profile}
              </h3>
            </div>

            {profileMsg && (
              <div
                className={`p-3 rounded text-xs flex items-center gap-2 ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-950/30 border border-emerald-800/60 text-emerald-300'
                    : 'bg-red-950/40 border border-red-800/80 text-red-300'
                }`}
              >
                {profileMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                  {t.account.fullName}
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    handleInputTracking(e);
                  }}
                  onFocus={handleInputTracking}
                  onKeyUp={handleInputTracking}
                  onClick={handleInputTracking}
                  onSelect={handleInputTracking}
                  onBlur={handleInputBlur}
                  placeholder={t.account.namePlaceholder}
                  className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:border-zinc-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                  {t.account.email}
                </label>
                <input
                  ref={emailInputRef}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    handleInputTracking(e);
                  }}
                  onFocus={handleInputTracking}
                  onKeyUp={handleInputTracking}
                  onClick={handleInputTracking}
                  onSelect={handleInputTracking}
                  onBlur={handleInputBlur}
                  placeholder="name@domain.com"
                  className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:border-zinc-500 transition-colors font-mono"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-300 disabled:opacity-50 text-zinc-950 font-medium text-xs font-mono uppercase tracking-wider rounded transition-colors shadow-sm"
                >
                  {isSavingProfile ? t.common.loading : t.account.saveProfile}
                </button>
              </div>
            </form>
          </div>

          {/* Password & Security Form */}
          <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-6 shadow-sm hover:border-zinc-700/60 transition-colors">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-zinc-400" />
                <h3 className="text-sm font-medium text-zinc-200 uppercase font-mono tracking-wider">
                  {t.account.security}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Show</span>
                  </>
                )}
              </button>
            </div>

            {passwordMsg && (
              <div
                className={`p-3 rounded text-xs flex items-center gap-2 ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-950/30 border border-emerald-800/60 text-emerald-300'
                    : 'bg-red-950/40 border border-red-800/80 text-red-300'
                }`}
              >
                {passwordMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                )}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                  {t.account.currentPassword}
                </label>
                <input
                  ref={currentPasswordRef}
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    handleInputTracking(e);
                  }}
                  onFocus={handleInputTracking}
                  onKeyUp={handleInputTracking}
                  onClick={handleInputTracking}
                  onSelect={handleInputTracking}
                  onBlur={handleInputBlur}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:border-zinc-500 transition-colors font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                    {t.account.newPassword}
                  </label>
                  <input
                    ref={newPasswordRef}
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      handleInputTracking(e);
                    }}
                    onFocus={handleInputTracking}
                    onKeyUp={handleInputTracking}
                    onClick={handleInputTracking}
                    onSelect={handleInputTracking}
                    onBlur={handleInputBlur}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:border-zinc-500 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                    {t.account.confirmPassword}
                  </label>
                  <input
                    ref={confirmPasswordRef}
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      handleInputTracking(e);
                    }}
                    onFocus={handleInputTracking}
                    onKeyUp={handleInputTracking}
                    onClick={handleInputTracking}
                    onSelect={handleInputTracking}
                    onBlur={handleInputBlur}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:border-zinc-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-300 disabled:opacity-50 text-zinc-950 font-medium text-xs font-mono uppercase tracking-wider rounded transition-colors shadow-sm"
                >
                  {isUpdatingPassword ? t.common.loading : t.account.changePassword}
                </button>
              </div>
            </form>
          </div>

          {/* Danger Zone: Delete Account */}
          <div className="p-6 bg-red-950/10 border border-red-900/40 rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <h3 className="text-sm font-medium uppercase font-mono tracking-wider">
                {t.account.dangerZone}
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-mono">
              {t.account.deleteWarning}
            </p>
            <div>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmationText('');
                  setDeleteMsg(null);
                  setIsDeleteModalOpen(true);
                }}
                className="px-3 py-2 bg-red-900/40 hover:bg-red-900/60 border border-red-800 text-red-300 font-mono text-xs rounded transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.account.deleteAccount}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-medium font-mono uppercase">
                {t.account.deleteAccount}
              </h3>
            </div>

            <p className="text-xs text-zinc-400 font-mono">
              {t.account.confirmDeletePrompt}
            </p>

            <input
              type="text"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 text-xs font-mono uppercase bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:border-red-500 transition-colors"
            />

            {deleteMsg && (
              <p className="text-xs text-red-400 font-mono">{deleteMsg}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmationText.trim().toUpperCase() !== 'DELETE'}
                className="px-3 py-1.5 text-xs font-mono uppercase bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded transition-colors"
              >
                {isDeleting ? t.common.loading : t.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
