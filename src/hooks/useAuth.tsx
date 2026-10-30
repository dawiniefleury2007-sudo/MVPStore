import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { authService, exchangeOAuthCodeOnce, startGoogleLogin } from '@/lib/auth';

interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar?: string;
}
interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  service: typeof authService;
  google: typeof startGoogleLogin;
}
interface AuthProviderProps { children: ReactNode; }
const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_RESTORE_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: number | undefined;
  return Promise.race([
    promise.finally(() => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    }),
    new Promise<T>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

function mapSupabaseUser(user: SupabaseUser): AuthUser {
  const metadata = user.user_metadata;
  const name = metadata?.username || metadata?.full_name;
  const avatar = metadata?.avatar_url || metadata?.picture;
  return {
    id: user.id,
    email: user.email || '',
    username: typeof name === 'string' ? name : user.email?.split('@')[0] || 'Member',
    avatar: typeof avatar === 'string' ? avatar : undefined,
  };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    let initialSessionSettled = false;

    const reportError = (error: unknown) => {
      if (mounted) toast.error(error instanceof Error ? error.message : 'Unable to restore your session. Please retry signing in.');
    };

    // Wait for the initial session before declaring auth ready.
    // This prevents brief "logged out" UI on refresh and reduces flicker.
    withTimeout(
      supabase.auth.getSession(),
      SESSION_RESTORE_TIMEOUT_MS,
      'Connection timeout while restoring your session. You can still continue and retry sign-in.',
    )
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) reportError(error);

        const initialUser = data.session?.user ? mapSupabaseUser(data.session.user) : null;
        setUser(initialUser);

        // Only mark loading complete after we have the first authoritative session.
        if (!initialSessionSettled) {
          initialSessionSettled = true;
          setLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        reportError(error);
        if (!initialSessionSettled) {
          initialSessionSettled = true;
          setLoading(false);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      const nextUser = session?.user ? mapSupabaseUser(session.user) : null;
      setUser(nextUser);

      // Mark the first real auth event as settled (covers INITIAL_SESSION, SIGNED_IN, etc.)
      if (!initialSessionSettled) {
        initialSessionSettled = true;
        setLoading(false);
      }
    });

    const onOAuthMessage = (event: MessageEvent<unknown>) => {
      const message = event.data;
      if (typeof message !== 'object' || message === null || !('type' in message)) return;
      if (message.type === 'OAUTH_CODE' && 'code' in message && typeof message.code === 'string' && message.code.trim()) {
        void exchangeOAuthCodeOnce(message.code).catch(reportError);
      } else if (message.type === 'OAUTH_ERROR') {
        reportError(new Error('第三方登录未完成，请返回登录页面重试。'));
      }
    };
    window.addEventListener('message', onOAuthMessage);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('message', onOAuthMessage);
    };
  }, []);
  const value = useMemo<AuthContextValue>(() => ({ user, loading, service: authService, google: startGoogleLogin }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
