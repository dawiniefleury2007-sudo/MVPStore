import { createClient, FunctionsHttpError } from '@supabase/supabase-js';
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { auth: { flowType:'pkce', persistSession:true, autoRefreshToken:true, detectSessionInUrl:false } });
export async function api<T>(operation:string, payload:Record<string,unknown> = {}):Promise<T> {
 const {data,error}=await supabase.functions.invoke('mvp-api',{body:{operation,...payload}});
 if(error){let message=error.message;if(error instanceof FunctionsHttpError){const text=await error.context.text();let parsed:unknown;try{parsed=JSON.parse(text);}catch{parsed=null;}message=parsed&&typeof parsed==='object'&&'error' in parsed?String(parsed.error):'The server request failed. Please retry.';}throw new Error(message);}return data as T;
}
