import { createClient, FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';

const CLOUD_REQUEST_TIMEOUT_MS = 12000;

const timedFetch: typeof fetch = (input, init) => {
  const requestInit = init ?? {};
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, CLOUD_REQUEST_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort(requestInit.signal?.reason);

  if (requestInit.signal?.aborted) abortFromCaller();
  else requestInit.signal?.addEventListener('abort', abortFromCaller, { once: true });

  return fetch(input, { ...requestInit, signal: controller.signal }).finally(() => {
    globalThis.clearTimeout(timeoutId);
    requestInit.signal?.removeEventListener('abort', abortFromCaller);
  });
};

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
    global: { fetch: timedFetch },
  },
);

export async function api<T = unknown>(
  operation: string,
  parameters: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('mvp-api', {
    body: { ...parameters, operation },
    timeout: CLOUD_REQUEST_TIMEOUT_MS,
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const status = error.context.status;
      const responseText = await error.context.text().catch(() => '');
      let serverMessage = '';
      try {
        const response: unknown = JSON.parse(responseText);
        if (
          typeof response === 'object' && response !== null &&
          'error' in response && typeof response.error === 'string'
        ) {
          serverMessage = response.error;
        }
      } catch {
        // HTTP error bodies may be empty or non-JSON.
      }

      if (status === 401) throw new Error('Your session expired. Sign in again and retry.');
      if (status === 403 && serverMessage) throw new Error(serverMessage);
      if (status === 429) throw new Error('Too many requests. Wait a moment, then retry.');
      if (status >= 500) throw new Error('The store service is temporarily unavailable. Please retry shortly.');
      if (status === 400 && serverMessage) throw new Error(serverMessage);
      if (status === 404) throw new Error('This store feature is not available right now.');
      throw new Error('The store could not complete this request. Check the submitted information and retry.');
    }
    if (error instanceof FunctionsFetchError) {
      const timedOut = error.context?.name === 'AbortError' || error.context?.name === 'TimeoutError';
      throw new Error(timedOut
        ? 'The store request timed out. Please retry in a moment.'
        : 'Unable to reach the store service. Check your connection and retry.');
    }
    if (error instanceof FunctionsRelayError) {
      throw new Error('The store service could not route this request. Please retry shortly.');
    }
    throw new Error('The store request failed. Please retry in a moment.');
  }

  if (
    typeof data === 'object' && data !== null &&
    'error' in data && typeof data.error === 'string'
  ) {
    throw new Error(data.error);
  }
  return data as T;
}
