import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
  'SUPABASE_SERVICE_ROLE_KEY',
);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required Supabase environment variables');
}

export const backend = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);

const IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const MAX_ROWS = 500;

export async function identity(
  req: Request,
  optional = false,
) {
  const authorization = req.headers.get('Authorization');
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);
  const token = match?.[1];

  if (!token) {
    if (optional) return null;
    throw new Error('Authentication required');
  }

  const { data, error } = await backend.auth.getUser(token);

  if (error || !data.user) {
    if (optional) return null;
    throw new Error('Authentication required');
  }

  return data.user;
}

export async function rpc<T>(
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  if (!IDENTIFIER_PATTERN.test(name)) {
    throw new Error('Invalid RPC function name');
  }

  const { data, error } = await backend.rpc(name, args);

  if (error) {
    // Log details server-side, but do not expose database internals to clients.
    console.error(`RPC ${name} failed:`, error.message);
    throw new Error('Database operation failed');
  }

  return data as T;
}

export async function isAdmin(id: string): Promise<boolean> {
  if (!id) return false;

  return (await rpc<unknown>('mvp_is_admin', {
    p_user: id,
  })) === true;
}

export async function activeReseller(id: string): Promise<boolean> {
  if (!id) return false;

  return (await rpc<unknown>('mvp_active_reseller', {
    p_user: id,
  })) === true;
}

export async function rows(
  table: string,
  select: string,
  filter?: { key: string; value: string },
  limit = 100,
) {
  if (!IDENTIFIER_PATTERN.test(table)) {
    throw new Error('Invalid table name');
  }

  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > MAX_ROWS
  ) {
    throw new Error(`Limit must be between 1 and ${MAX_ROWS}`);
  }

  if (filter && !IDENTIFIER_PATTERN.test(filter.key)) {
    throw new Error('Invalid filter column');
  }

  let query = backend
    .from(table)
    .select(select)
    .limit(limit);

  if (filter) {
    query = query.eq(filter.key, filter.value);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Query on ${table} failed:`, error.message);
    throw new Error(`Unable to load ${table}`);
  }

  return data ?? [];
}
