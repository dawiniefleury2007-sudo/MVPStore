import { createClient, FunctionsHttpError } from '@supabase/supabase-js';

// All browser authentication and Cloud requests share this one PKCE client.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);

export async function api<T = unknown>(
  operation: string,
  parameters: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('mvp-api', {
    body: { ...parameters, operation },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const status = error.context.status;
      const responseText = await error.context.text().catch(() => '');
      let message = responseText || error.message;
      if (responseText) {
        try {
          const response: unknown = JSON.parse(responseText);
          if (
            typeof response === 'object' && response !== null &&
            'error' in response && typeof response.error === 'string'
          ) {
            message = response.error;
          }
        } catch {
          // Non-JSON responses still provide useful server error details.
        }
      }
      throw new Error(`[Code: ${status}] ${message}`);
    }
    throw new Error(error.message || 'Cloud request failed. Please try again.');
  }

  if (
    typeof data === 'object' && data !== null &&
    'error' in data && typeof data.error === 'string'
  ) {
    throw new Error(data.error);
  }
  return data as T;
}
