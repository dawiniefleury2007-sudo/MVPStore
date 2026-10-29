
import { supabase } from '@/lib/supabase';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StreamEvent {
  choices?: Array<{
    delta?: {
      content?: string | null;
    };
    finish_reason?: string | null;
  }>;
  error?: {
    message?: string;
  };
}

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 8_000;
const MAX_ERROR_LENGTH = 500;

function getEndpoint(): string {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (
    typeof baseUrl !== 'string' ||
    !baseUrl.trim() ||
    typeof apiKey !== 'string' ||
    !apiKey.trim()
  ) {
    throw new Error('The assistant service is not configured.');
  }

  try {
    const url = new URL(baseUrl);

    if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
      throw new Error('Invalid protocol');
    }

    return `${url.origin}${url.pathname.replace(/\/+$/, '')}/functions/v1/reseller-chat`;
  } catch {
    throw new Error('The assistant service URL is invalid.');
  }
}

function validateMessages(messages: ChatMessage[]): void {
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > MAX_MESSAGES
  ) {
    throw new Error('Invalid conversation. Please start a new chat.');
  }

  for (const message of messages) {
    if (
      !message ||
      !['user', 'assistant'].includes(message.role) ||
      typeof message.content !== 'string' ||
      !message.content.trim() ||
      message.content.length > MAX_MESSAGE_LENGTH
    ) {
      throw new Error('Invalid message. Please check your conversation.');
    }
  }

  if (messages[messages.length - 1].role !== 'user') {
    throw new Error('Send a message before requesting a response.');
  }
}

function extractError(text: string, status: number): string {
  let message = 'Unable to reach the reseller assistant.';

  try {
    const body: unknown = JSON.parse(text);

    if (
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'string'
    ) {
      message = body.error.slice(0, MAX_ERROR_LENGTH);
    }
  } catch {
    // Do not display arbitrary HTML or raw server responses.
  }

  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }

  if (status === 403) {
    return 'Active reseller access is required to use this assistant.';
  }

  if (status === 429 || status === 503) {
    return 'The assistant is busy or temporarily unavailable. Please try again shortly.';
  }

  if (status >= 500) {
    return 'The assistant service encountered an error. Please try again later.';
  }

  return message;
}

export async function streamChat(
  messages: ChatMessage[],
  imagePath: string | undefined,
  onChunk: (text: string) => void,
  signal: AbortSignal,
): Promise<void> {
  signal.throwIfAborted();

  validateMessages(messages);

  if (
    imagePath !== undefined &&
    (
      typeof imagePath !== 'string' ||
      !imagePath.trim() ||
      imagePath.length > 1_024
    )
  ) {
    throw new Error('Invalid image attachment.');
  }

  const endpoint = getEndpoint();
  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const { data, error } = await supabase.auth.getSession();

  signal.throwIfAborted();

  if (error) {
    throw new Error('Unable to verify your session. Please sign in again.');
  }

  if (!data.session) {
    throw new Error(
      'Please sign in before using the reseller assistant.',
    );
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      apikey: apiKey,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      messages,
      ...(imagePath ? { imagePath } : {}),
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');

    throw new Error(
      `[Code: ${response.status}] ${extractError(errorText, response.status)}`,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (
    !contentType.toLowerCase().includes('text/event-stream') ||
    !response.body
  ) {
    await response.body?.cancel().catch(() => undefined);

    throw new Error(
      'The assistant returned an invalid streaming response. Please retry.',
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let eventData: string[] = [];
  let finished = false;
  let receivedContent = false;

  const dispatchEvent = (): void => {
    if (eventData.length === 0) return;

    const payload = eventData.join('\n').trim();
    eventData = [];

    if (!payload) return;

    if (payload === '[DONE]') {
      finished = true;
      return;
    }

    let event: StreamEvent;

    try {
      event = JSON.parse(payload) as StreamEvent;
    } catch {
      throw new Error('The assistant sent an invalid streaming event.');
    }

    if (event.error) {
      throw new Error(
        event.error.message?.slice(0, MAX_ERROR_LENGTH) ||
          'The assistant could not finish the response.',
      );
    }

    const content = event.choices?.[0]?.delta?.content;

    if (typeof content === 'string' && content.length > 0) {
      receivedContent = true;
      onChunk(content);
    }
  };

  const consumeLine = (line: string): void => {
    // Support CRLF and LF line endings.
    const value = line.replace(/\r$/, '');

    // A blank line ends an SSE event.
    if (value === '') {
      dispatchEvent();
      return;
    }

    // Ignore SSE comments and unsupported fields.
    if (value.startsWith(':')) return;

    if (value.startsWith('data:')) {
      let data = value.slice(5);

      if (data.startsWith(' ')) {
        data = data.slice(1);
      }

      eventData.push(data);
    }
  };

  try {
    while (!finished) {
      signal.throwIfAborted();

      const { value, done } = await reader.read();

      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf('\n');

      while (newlineIndex !== -1 && !finished) {
        const line = buffer.slice(0, newlineIndex);

        buffer = buffer.slice(newlineIndex + 1);

        consumeLine(line);

        newlineIndex = buffer.indexOf('\n');
      }

      if (done) {
        // Process a final line even if the stream did not end
        // with a newline character.
        if (!finished && buffer.length > 0) {
          consumeLine(buffer);
          buffer = '';
        }

        if (!finished) {
          dispatchEvent();
        }

        break;
      }
    }

    signal.throwIfAborted();

    if (!finished) {
      throw new Error(
        receivedContent
          ? 'The response ended unexpectedly. Please retry.'
          : 'The assistant could not complete the response. Please retry.',
      );
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
