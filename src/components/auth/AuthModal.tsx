import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Lock, User as UserIcon, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { InteractiveBlobatar } from '../common/InteractiveBlobatar';
import { NavigationModule } from '../../types';
import { useApp } from '../../context/AppContext';
import { getInputCaretCoordinates } from '../../lib/caret';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, authModalMode, setAuthModalMode, signIn, signUp } = useAuth();
  const { t } = useTranslation();
  const { setActiveModule } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [activeInputRef, setActiveInputRef] = useState<HTMLElement | null>(null);
  const [caretCoords, setCaretCoords] = useState<{ x: number; y: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);

  if (!isAuthModalOpen) return null;

  // Blobatar seed name: uses entered name, or email prefix if sign in, or fallback
  const blobatarSeed = (fullName.trim()) || (email ? email.split('@')[0] : '') || 'User';

  // Eyes ONLY close when the password is shown. If password is hidden with dots, eyes stay open.
  const isClosedEyes = showPassword;

  const handleInputTracking = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const coords = getInputCaretCoordinates(e.currentTarget);
    setCaretCoords(coords);
  };

  const handleInputBlur = () => {
    setCaretCoords(null);
    setActiveInputRef(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (authModalMode === 'signup') {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (authModalMode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMsg(error.message);
        } else {
          setActiveModule('agenda');
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          setErrorMsg(error.message);
        } else {
          setActiveModule('agenda');
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected authentication error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigateToLegal = (module: NavigationModule) => {
    setIsAuthModalOpen(false);
    setActiveModule(module);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm animate-modal-backdrop">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl p-6 sm:p-8 flex flex-col animate-modal-pop">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
          aria-label={t.common.close}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Interactive Avatar Header */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="mb-4 flex items-center justify-center">
            <InteractiveBlobatar
              name={blobatarSeed}
              size={108}
              isClosedEyes={isClosedEyes}
              targetCoordinates={caretCoords}
              targetFocusElement={activeInputRef}
            />
          </div>

          <h2 className="text-lg font-medium text-zinc-100 tracking-tight">
            {authModalMode === 'signin' ? t.account.signIn : t.account.signUp}
          </h2>
          <p className="text-xs text-zinc-400 mt-1 text-center font-mono">
            {authModalMode === 'signin'
              ? 'Access your unified projects and agenda'
              : 'Create your account to sync tasks across devices'}
          </p>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-800/80 rounded text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authModalMode === 'signup' && (
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                {t.account.fullName}
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  ref={nameInputRef}
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    handleInputTracking(e);
                  }}
                  onFocus={(e) => {
                    setActiveInputRef(nameInputRef.current);
                    handleInputTracking(e);
                  }}
                  onKeyUp={handleInputTracking}
                  onClick={handleInputTracking}
                  onSelect={handleInputTracking}
                  onBlur={handleInputBlur}
                  placeholder={t.account.namePlaceholder}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
              {t.account.email}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                ref={emailInputRef}
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  handleInputTracking(e);
                }}
                onFocus={(e) => {
                  setActiveInputRef(emailInputRef.current);
                  handleInputTracking(e);
                }}
                onKeyUp={handleInputTracking}
                onClick={handleInputTracking}
                onSelect={handleInputTracking}
                onBlur={handleInputBlur}
                placeholder="name@domain.com"
                className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 transition-colors font-mono"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono uppercase text-zinc-400">
                {t.account.password}
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
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
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  handleInputTracking(e);
                }}
                onFocus={(e) => {
                  setActiveInputRef(passwordInputRef.current);
                  handleInputTracking(e);
                }}
                onKeyUp={handleInputTracking}
                onClick={handleInputTracking}
                onSelect={handleInputTracking}
                onBlur={handleInputBlur}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 transition-colors font-mono"
              />
            </div>
          </div>

          {authModalMode === 'signup' && (
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                {t.account.confirmPassword}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  ref={confirmPasswordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    handleInputTracking(e);
                  }}
                  onFocus={(e) => {
                    setActiveInputRef(confirmPasswordInputRef.current);
                    handleInputTracking(e);
                  }}
                  onKeyUp={handleInputTracking}
                  onClick={handleInputTracking}
                  onSelect={handleInputTracking}
                  onBlur={handleInputBlur}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 transition-colors font-mono"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-300 disabled:opacity-50 text-zinc-950 font-medium text-xs rounded transition-colors flex items-center justify-center gap-2 font-mono uppercase tracking-wider"
          >
            {isSubmitting ? (
              <span>{t.common.loading}...</span>
            ) : (
              <>
                <span>{authModalMode === 'signin' ? t.account.signIn : t.account.signUp}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Switch mode */}
        <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setAuthModalMode(authModalMode === 'signin' ? 'signup' : 'signin');
            }}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors font-mono"
          >
            {authModalMode === 'signin' ? t.account.needAccount : t.account.haveAccount}
          </button>
        </div>

        {/* Legal Links */}
        <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-zinc-500 font-mono">
          <button
            type="button"
            onClick={() => handleNavigateToLegal('privacy')}
            className="hover:text-zinc-400 transition-colors underline underline-offset-2"
          >
            {t.legal.privacyTitle}
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => handleNavigateToLegal('terms')}
            className="hover:text-zinc-400 transition-colors underline underline-offset-2"
          >
            {t.legal.termsTitle}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
