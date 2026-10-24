import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ADMIN_LOGIN_PATH, withAdminRole } from '@/lib/adminAccounts';

const AuthContext = createContext();

export function mapSupabaseUser(sbUser) {
  if (!sbUser) return null;
  const meta = sbUser.user_metadata || {};
  const base = {
    ...meta,
    id: sbUser.id,
    email: sbUser.email || meta.email || '',
    full_name:
      meta.full_name ||
      meta.name ||
      (sbUser.email ? sbUser.email.split('@')[0] : 'Dwellmark user'),
    phone: meta.phone || '',
    avatar_url: meta.avatar_url || '',
    role: sbUser.app_metadata?.role || meta.role || 'user',
  };
  return withAdminRole(base);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const applySupabaseUser = useCallback((sbUser) => {
    const mapped = mapSupabaseUser(sbUser);
    setUser((prev) => {
      if (!prev && !mapped) return prev;
      if (
        prev &&
        mapped &&
        prev.id === mapped.id &&
        prev.email === mapped.email &&
        prev.role === mapped.role &&
        prev.full_name === mapped.full_name &&
        prev.avatar_url === mapped.avatar_url &&
        prev.phone === mapped.phone
      ) {
        return prev;
      }
      return mapped;
    });
    setIsAuthenticated(Boolean(mapped));
  }, []);

  const checkUserAuth = useCallback(async () => {
    if (isSupabaseConfigured) {
      setIsLoadingAuth(true);
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        applySupabaseUser(data.user);
        setAuthError(null);
      } catch {
        applySupabaseUser(null);
      } finally {
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
      return;
    }

    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      const elevated = withAdminRole(currentUser);
      setUser(elevated);
      setIsAuthenticated(Boolean(elevated));
      setAuthError(null);
    } catch (error) {
      setIsAuthenticated(false);
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required',
        });
      }
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, [applySupabaseUser]);

  const checkAppState = useCallback(async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const publicSettings = await base44.app.getPublicSettings();
      setAppPublicSettings(publicSettings);

      if (appParams.token) {
        await checkUserAuth();
      } else {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthChecked(true);
      }
      setIsLoadingPublicSettings(false);
    } catch (appError) {
      console.error('App state check failed:', appError);

      if (appError.status === 403 && appError.data?.extra_data?.reason) {
        const reason = appError.data.extra_data.reason;
        if (reason === 'auth_required') {
          setAuthError({ type: 'auth_required', message: 'Authentication required' });
        } else if (reason === 'user_not_registered') {
          setAuthError({
            type: 'user_not_registered',
            message: 'User not registered for this app',
          });
        } else {
          setAuthError({ type: reason, message: appError.message });
        }
      } else {
        setAuthError({
          type: 'unknown',
          message: appError.message || 'Failed to load app',
        });
      }
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, [checkUserAuth]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      checkAppState();
      return;
    }

    let active = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!active) return;
        applySupabaseUser(data.session?.user);
      } catch (error) {
        if (active) {
          setAuthError({ type: 'unknown', message: error.message });
        }
      } finally {
        if (active) {
          setIsLoadingAuth(false);
          setIsLoadingPublicSettings(false);
          setAuthChecked(true);
        }
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      applySupabaseUser(session?.user);
      setAuthError(null);
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
      setAuthChecked(true);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [applySupabaseUser, checkAppState]);

  const logout = async (shouldRedirect = true) => {
    const wasAdmin = user?.role === 'admin';
    setUser(null);
    setIsAuthenticated(false);
    setAuthChecked(true);

    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Session is already gone locally; nothing else to clear.
      }
      if (shouldRedirect) {
        window.location.href = wasAdmin ? ADMIN_LOGIN_PATH : '/';
      }
      return;
    }

    if (shouldRedirect) {
      base44.auth.logout(wasAdmin ? ADMIN_LOGIN_PATH : window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    if (isSupabaseConfigured) {
      const returnTo = window.location.pathname + window.location.search;
      window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
      return;
    }
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
