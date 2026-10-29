import { supabase } from '@/lib/supabase';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
interface StreamEvent {
  choices?: Array<{ delta?: { content?: string } }>;
  error?: { message?: string };
}

export async function streamChat(
  messages: ChatMessage[],
  imagePath: string | undefined,
  onChunk: (text: string) => void,
  signal: AbortSignal,
): Promise<void> {
  signal.throwIfAborted();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  if (!data.session) throw new Error('Please sign in before using the reseller assistant.');
  signal.throwIfAborted();
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '')}/functions/v1/reseller-chat`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ messages, ...(imagePath ? { imagePath } : {}) }),
      signal,
    },
  );
  if (!response.ok) {
    const text = await response.text();
    let message = text || 'Unable to reach the reseller assistant.';
    try {
      const body: unknown = JSON.parse(text);
      if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
        message = body.error;
      }
    } catch {
      // Preserve non-JSON server error details.
    }
    throw new Error(`[Code: ${response.status}] ${message}`);
  }
  if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
    throw new Error('The assistant returned an invalid streaming response. Please retry.');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventLines: string[] = [];
  let finished = false;
  const dispatch = () => {
    if (!eventLines.length) return;
    const payload = eventLines.join('\n');
    eventLines = [];
    if (payload.trim() === '[DONE]') { finished = true; return; }
    const event = JSON.parse(payload) as StreamEvent;
    if (event.error) throw new Error(event.error.message || 'The assistant could not finish the response.');
    const content = event.choices?.[0]?.delta?.content;
    if (typeof content === 'string' && content) onChunk(content);
  };
  const consumeLine = (line: string) => {
    const value = line.replace(/\r$/, '');
    if (!value) dispatch();
    else if (value.startsWith('data:')) eventLines.push(value.slice(5).replace(/^ /, ''));
  };
  try {
    while (!finished) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let newline = buffer.indexOf('\n');
      while (newline !== -1 && !finished) {
        consumeLine(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf('\n');
      }
      if (done) {
        if (!finished && buffer) consumeLine(buffer);
        if (!finished) dispatch();
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
