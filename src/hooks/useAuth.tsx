import { createContext,useContext,useEffect,useState,type ReactNode } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '@/lib/api';
import { authService,exchangeOAuthCodeOnce,startGoogleLogin } from '@/lib/auth';
interface AuthState {user:SupabaseUser|null;loading:boolean;service:typeof authService;google:()=>Promise<void>;}
const AuthContext=createContext<AuthState|null>(null);
export function AuthProvider({children}:{children:ReactNode}){
 const [user,setUser]=useState<SupabaseUser|null>(null);const [loading,setLoading]=useState(true);
 useEffect(()=>{let mounted=true;supabase.auth.getSession().then(({data,error})=>{if(!mounted)return;if(error)toast.error('Unable to restore your session. Sign in again.');setUser(data.session?.user||null);setLoading(false);},()=>{if(mounted){setLoading(false);toast.error('Session restore failed. Check your connection.');}});
 const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if(!mounted)return;setUser(session?.user||null);setLoading(false);});
 const onMessage=(event:MessageEvent)=>{if(event.data?.type==='OAUTH_CODE'&&typeof event.data.code==='string')void exchangeOAuthCodeOnce(event.data.code).catch(e=>toast.error(e.message));if(event.data?.type==='OAUTH_ERROR'&&typeof event.data.message==='string')toast.error(event.data.message);};window.addEventListener('message',onMessage);
 return()=>{mounted=false;subscription.unsubscribe();window.removeEventListener('message',onMessage);};},[]);
 return <AuthContext.Provider value={{user,loading,service:authService,google:startGoogleLogin}}>{children}</AuthContext.Provider>;
}
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error('AuthProvider missing');return value;}
