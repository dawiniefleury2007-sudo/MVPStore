import { createClient } from 'npm:@supabase/supabase-js@2';
export const backend = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
export async function identity(req: Request, optional = false) {
 const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
 if (!token) { if (optional) return null; throw new Error('Authentication required'); }
 const { data, error } = await backend.auth.getUser(token);
 if (error || !data.user) { if (optional) return null; throw new Error('Authentication required'); }
 return data.user;
}
export async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
 const { data, error } = await backend.rpc(name, args); if (error) throw new Error(error.message); return data as T;
}
export async function isAdmin(id: string) { return rpc<boolean>('mvp_is_admin', { p_user: id }); }
export async function activeReseller(id: string) { return rpc<boolean>('mvp_active_reseller', { p_user: id }); }
export async function rows(table: string, select: string, filter?: { key: string; value: string }, limit = 100) {
 let query = backend.from(table).select(select).limit(limit); if (filter) query = query.eq(filter.key, filter.value);
 const { data, error } = await query; if (error) throw new Error('Unable to load ' + table); return data || [];
}
