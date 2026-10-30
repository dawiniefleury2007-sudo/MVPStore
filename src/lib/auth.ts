import { supabase } from '@/lib/supabase';

export function authErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : '';
  const normalized = message.toLowerCase();
  const status = typeof error === 'object' && error !== null && 'status' in error
    ? Number(error.status)
    : undefined;

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'You are offline. Reconnect and retry signing in.';
  }
  if (/invalid login credentials/.test(normalized)) return 'Email or password is incorrect.';
  if (/email not confirmed/.test(normalized)) return 'Confirm your email before signing in.';
  if (/too many requests|rate limit|security purposes/.test(normalized) || status === 429) {
    return 'Too many sign-in attempts. Wait a moment, then retry.';
  }
  if (/failed to fetch|networkerror|fetch failed|timeout|timed out|aborterror/.test(normalized)) {
    return 'Unable to reach the sign-in service. Check your connection and retry.';
  }
  if (status && status >= 500) return 'The sign-in service is temporarily unavailable. Please retry shortly.';
  if (/invalid api key|not found|404/.test(normalized) || status === 404) {
    return 'The sign-in service is not configured correctly. Contact support.';
  }
  if (/^enter |^use at least |^password |尚未在 supabase|not enabled|unsupported provider/.test(normalized)) return message;
  return 'Sign-in could not be completed. Check your details and retry.';
}

// Reuse the application's single persistent PKCE client for every auth flow.
export const authService = {
  async sendOtp(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(), options: { shouldCreateUser: true },
    });
    if (error) throw error;
  },
  async verify(email: string, token: string, password: string, name: string) {
    if (!/^\d{4,8}$/.test(token)) throw new Error('Enter the email verification code.');
    if (password.length < 6) throw new Error('Use at least 6 characters for your password.');
    if (name.trim().length < 2) throw new Error('Enter a display name of at least 2 characters.');
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'email' });
    if (error) throw error;
    const { data, error: updateError } = await supabase.auth.updateUser({
      password, data: { username: name.trim() },
    });
    if (updateError) throw updateError;
    return data.user;
  },
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    return data.user;
  },
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  async recover(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=reset`,
    });
    if (error) throw error;
  },
  async password(password: string) {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    return data.user;
  },
};

const codeExchanges = new Map<string, Promise<void>>();
export function exchangeOAuthCodeOnce(code: string): Promise<void> {
  if (!code.trim()) return Promise.reject(new Error('No authorization code was received. Restart login.'));
  const existing = codeExchanges.get(code);
  if (existing) return existing;
  const exchange = Promise.resolve().then(async () => {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    // AuthProvider's auth-state listener owns the resulting session update.
  });
  codeExchanges.set(code, exchange);
  return exchange;
}

function isInIframe(): boolean {
  try { return window.self !== window.top; } catch { return true; }
}
let oauthPopup: Window | null = null;
async function startSocialLogin(provider: 'google' | 'apple' | 'discord'): Promise<void> {
  const iframe = isInIframe();
  const left = Math.max(0, window.screenX + (window.outerWidth - 520) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - 720) / 2);
  oauthPopup?.close();
  // Reserve the popup synchronously, before any awaited authorization request.
  const popup = iframe ? window.open('about:blank', 'onspace-oauth',
    `popup=yes,width=520,height=720,left=${Math.round(left)},top=${Math.round(top)}`) : null;
  if (iframe && !popup) throw new Error('登录弹窗被浏览器拦截，请允许弹窗后重试。');
  oauthPopup = popup;
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: {
      redirectTo: `${window.location.origin}/auth/callback`, skipBrowserRedirect: true,
    } });
    if (error) {
      if (/provider is not enabled|unsupported provider/i.test(error.message)) {
        throw new Error(`${provider} 登录尚未在 Supabase Auth Providers 中启用。`);
      }
      throw error;
    }
    if (!data.url) throw new Error('无法启动第三方登录，请检查登录配置后重试。');
    if (iframe && popup) {
      if (popup.closed) throw new Error('登录弹窗已关闭，请重新登录。');
      popup.location.assign(data.url);
    } else window.location.assign(data.url);
  } catch (error) {
    popup?.close();
    if (oauthPopup === popup) oauthPopup = null;
    throw error;
  }
}

export function startGoogleLogin(): Promise<void> {
  return startSocialLogin('google');
}

export function startAppleLogin(): Promise<void> {
  return startSocialLogin('apple');
}

export function startDiscordLogin(): Promise<void> {
  return startSocialLogin('discord');
}
