import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile } from '../types';
import {
  checkRateLimit,
  recordRateLimitAttempt,
  resetRateLimit,
  RATE_LIMIT_CONFIGS,
} from '../lib/rateLimit';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'signin' | 'signup';
  setAuthModalMode: (mode: 'signin' | 'signup') => void;
  openSignIn: () => void;
  openSignUp: () => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfileName: (fullName: string) => Promise<{ error: Error | null }>;
  updateEmail: (newEmail: string) => Promise<{ error: Error | null }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_KEY = 'agenda_local_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  const openSignIn = useCallback(() => {
    setAuthModalMode('signin');
    setIsAuthModalOpen(true);
  }, []);

  const openSignUp = useCallback(() => {
    setAuthModalMode('signup');
    setIsAuthModalOpen(true);
  }, []);

  // Fetch or sync public profile
  const fetchProfile = useCallback(async (userId: string, userEmail: string, metaName?: string) => {
    if (!isSupabaseConfigured || !supabase) {
      setProfile({
        id: userId,
        email: userEmail,
        full_name: metaName || 'User',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile({
          id: userId,
          email: userEmail,
          full_name: data.full_name || metaName || '',
          avatar_url: data.avatar_url,
          created_at: data.created_at,
          updated_at: data.updated_at,
        });
        return;
      }

      // Self-provision if profile row does not exist yet
      const defaultName = metaName || (userEmail ? userEmail.split('@')[0] : 'User');
      const { data: inserted } = await supabase
        .from('profiles')
        .insert({ id: userId, full_name: defaultName })
        .select()
        .maybeSingle();

      setProfile({
        id: userId,
        email: userEmail,
        full_name: inserted?.full_name || defaultName,
        avatar_url: inserted?.avatar_url,
        created_at: inserted?.created_at,
        updated_at: inserted?.updated_at,
      });
    } catch {
      setProfile({
        id: userId,
        email: userEmail,
        full_name: metaName || (userEmail ? userEmail.split('@')[0] : 'User'),
      });
    }
  }, []);

  // Initialize Supabase Auth state or fallback local session
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(
            session.user.id,
            session.user.email ?? '',
            session.user.user_metadata?.full_name
          );
        }
        setIsLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(
            session.user.id,
            session.user.email ?? '',
            session.user.user_metadata?.full_name
          );
        } else {
          setProfile(null);
        }
        setIsLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // Local fallback: only restore if a session was previously saved
      try {
        const stored = localStorage.getItem(LOCAL_USER_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed.user ?? null);
          setProfile(parsed.profile ?? null);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    }
  }, [fetchProfile]);

  // Sign In with email & password
  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const emailKey = email.trim().toLowerCase();
    const rateLimitKey = `signin_${emailKey}`;

    const check = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.SIGN_IN);
    if (!check.allowed) {
      return {
        error: new Error(
          `Too many failed login attempts. For security, please wait ${check.retryAfterSeconds} second${
            check.retryAfterSeconds === 1 ? '' : 's'
          } before trying again.`
        ),
      };
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const attempt = recordRateLimitAttempt(rateLimitKey, RATE_LIMIT_CONFIGS.SIGN_IN);
        if (!attempt.allowed) {
          return {
            error: new Error(
              `Too many failed login attempts. For security, please wait ${attempt.retryAfterSeconds} second${
                attempt.retryAfterSeconds === 1 ? '' : 's'
              } before trying again.`
            ),
          };
        }
        return { error };
      }
      resetRateLimit(rateLimitKey);
      if (data.user) {
        await fetchProfile(data.user.id, data.user.email ?? email, data.user.user_metadata?.full_name);
      }
      setIsAuthModalOpen(false);
      return { error: null };
    } else {
      // Local fallback
      resetRateLimit(rateLimitKey);
      const demoUser = {
        id: 'local-' + Date.now(),
        email,
        user_metadata: { full_name: email.split('@')[0] },
      } as unknown as User;
      const demoProfile: UserProfile = {
        id: demoUser.id,
        email,
        full_name: email.split('@')[0],
      };
      setUser(demoUser);
      setProfile(demoProfile);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify({ user: demoUser, profile: demoProfile }));
      setIsAuthModalOpen(false);
      return { error: null };
    }
  };

  // Sign Up with email, password & name
  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<{ error: Error | null }> => {
    const rateLimitKey = 'signup_global';
    const check = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.SIGN_UP);
    if (!check.allowed) {
      return {
        error: new Error(
          `Too many sign-up attempts. For security, please wait ${check.retryAfterSeconds} second${
            check.retryAfterSeconds === 1 ? '' : 's'
          } before trying again.`
        ),
      };
    }

    recordRateLimitAttempt(rateLimitKey, RATE_LIMIT_CONFIGS.SIGN_UP);

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });
      if (error) return { error };
      if (data.user) {
        await fetchProfile(data.user.id, email, fullName.trim());
      }
      setIsAuthModalOpen(false);
      return { error: null };
    } else {
      // Local fallback
      const demoUser = {
        id: 'local-' + Date.now(),
        email,
        user_metadata: { full_name: fullName.trim() || email.split('@')[0] },
      } as unknown as User;
      const demoProfile: UserProfile = {
        id: demoUser.id,
        email,
        full_name: fullName.trim() || email.split('@')[0],
      };
      setUser(demoUser);
      setProfile(demoProfile);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify({ user: demoUser, profile: demoProfile }));
      setIsAuthModalOpen(false);
      return { error: null };
    }
  };

  // Sign Out
  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem(LOCAL_USER_KEY);
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  // Update profile name
  const updateProfileName = async (fullName: string): Promise<{ error: Error | null }> => {
    const trimmed = fullName.trim();
    if (!user) return { error: new Error('User not authenticated') };

    if (isSupabaseConfigured && supabase) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (existing) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: trimmed })
          .eq('id', user.id);
        if (profileError) return { error: profileError };
      } else {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ id: user.id, full_name: trimmed });
        if (profileError) return { error: profileError };
      }

      await supabase.auth.updateUser({
        data: { full_name: trimmed },
      });

      setProfile((prev) => (prev ? { ...prev, full_name: trimmed } : null));
      return { error: null };
    } else {
      // Local fallback
      setProfile((prev) => (prev ? { ...prev, full_name: trimmed } : null));
      if (user) {
        const updatedUser = {
          ...user,
          user_metadata: { ...user.user_metadata, full_name: trimmed },
        };
        setUser(updatedUser as User);
        localStorage.setItem(
          LOCAL_USER_KEY,
          JSON.stringify({ user: updatedUser, profile: { ...profile, full_name: trimmed } })
        );
      }
      return { error: null };
    }
  };

  // Update Email
  const updateEmail = async (newEmail: string): Promise<{ error: Error | null }> => {
    const trimmed = newEmail.trim();
    if (!user) return { error: new Error('User not authenticated') };

    const rateLimitKey = `email_change_${user.id}`;
    const check = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.EMAIL_CHANGE);
    if (!check.allowed) {
      return {
        error: new Error(
          `Too many email change attempts. Please wait ${check.retryAfterSeconds} second${
            check.retryAfterSeconds === 1 ? '' : 's'
          } before trying again.`
        ),
      };
    }
    recordRateLimitAttempt(rateLimitKey, RATE_LIMIT_CONFIGS.EMAIL_CHANGE);

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.updateUser({ email: trimmed });
      if (error) return { error };
      setProfile((prev) => (prev ? { ...prev, email: trimmed } : null));
      return { error: null };
    } else {
      setProfile((prev) => (prev ? { ...prev, email: trimmed } : null));
      const updatedUser = { ...user, email: trimmed } as User;
      setUser(updatedUser);
      localStorage.setItem(
        LOCAL_USER_KEY,
        JSON.stringify({ user: updatedUser, profile: { ...profile, email: trimmed } })
      );
      return { error: null };
    }
  };

  // Change Password with current password verification
  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ error: Error | null }> => {
    if (!user || !user.email) return { error: new Error('User not authenticated') };

    const rateLimitKey = `pwd_change_${user.id}`;
    const check = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.PASSWORD_CHANGE);
    if (!check.allowed) {
      return {
        error: new Error(
          `Too many password change attempts. Please wait ${check.retryAfterSeconds} second${
            check.retryAfterSeconds === 1 ? '' : 's'
          } before trying again.`
        ),
      };
    }

    if (isSupabaseConfigured && supabase) {
      // Re-authenticate user with current password to verify identity
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        const attempt = recordRateLimitAttempt(rateLimitKey, RATE_LIMIT_CONFIGS.PASSWORD_CHANGE);
        if (!attempt.allowed) {
          return {
            error: new Error(
              `Too many failed attempts. For security, please wait ${attempt.retryAfterSeconds} second${
                attempt.retryAfterSeconds === 1 ? '' : 's'
              } before trying again.`
            ),
          };
        }
        return { error: new Error('Current password verification failed. Please re-enter your password.') };
      }

      resetRateLimit(rateLimitKey);

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) return { error: updateError };
      return { error: null };
    } else {
      // Local fallback check
      if (currentPassword.length < 4) {
        const attempt = recordRateLimitAttempt(rateLimitKey, RATE_LIMIT_CONFIGS.PASSWORD_CHANGE);
        if (!attempt.allowed) {
          return {
            error: new Error(
              `Too many failed attempts. For security, please wait ${attempt.retryAfterSeconds} second${
                attempt.retryAfterSeconds === 1 ? '' : 's'
              } before trying again.`
            ),
          };
        }
        return { error: new Error('Current password is incorrect.') };
      }
      resetRateLimit(rateLimitKey);
      return { error: null };
    }
  };

  // Delete Account with cascading deletion
  const deleteAccount = async (): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error('User not authenticated') };

    const rateLimitKey = `delete_account_${user.id}`;
    const check = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.ACCOUNT_DELETE);
    if (!check.allowed) {
      return {
        error: new Error(
          `Too many account deletion attempts. Please wait ${check.retryAfterSeconds} second${
            check.retryAfterSeconds === 1 ? '' : 's'
          } before trying again.`
        ),
      };
    }
    recordRateLimitAttempt(rateLimitKey, RATE_LIMIT_CONFIGS.ACCOUNT_DELETE);

    if (isSupabaseConfigured && supabase) {
      // Call secure security definer RPC
      const { error } = await supabase.rpc('delete_user_account');
      if (error) {
        return { error };
      }
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem(LOCAL_USER_KEY);
      localStorage.removeItem('agenda_clients');
      localStorage.removeItem('agenda_projects');
      localStorage.removeItem('agenda_tasks');
    }

    setUser(null);
    setSession(null);
    setProfile(null);
    return { error: null };
  };

  const value = {
    user,
    profile,
    session,
    isLoading,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    openSignIn,
    openSignUp,
    signIn,
    signUp,
    signOut,
    updateProfileName,
    updateEmail,
    changePassword,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
