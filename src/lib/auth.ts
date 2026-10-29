import { supabase } from '@/lib/supabase';
const exchanges=new Map<string,Promise<void>>();
export function exchangeOAuthCodeOnce(code:string):Promise<void>{const existing=exchanges.get(code);if(existing)return existing;const promise=supabase.auth.exchangeCodeForSession(code).then(({error})=>{if(error)throw new Error('Unable to complete login. Restart sign-in and try again.');});exchanges.set(code,promise);return promise;}
export function startGoogleLogin():Promise<void>{
 const iframe=window.self!==window.top;const width=520,height=720;
 const popup=iframe?window.open('about:blank','onspace-oauth',`popup=yes,width=${width},height=${height},left=${Math.max(0,Math.round(window.screenX+(window.outerWidth-width)/2))},top=${Math.max(0,Math.round(window.screenY+(window.outerHeight-height)/2))}`):null;
 if(iframe&&!popup)return Promise.reject(new Error('登录弹窗被浏览器拦截，请允许弹窗后重试。'));
 return supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${window.location.origin}/auth/callback`,skipBrowserRedirect:true}}).then(({data,error})=>{if(error||!data.url){popup?.close();throw new Error('Google login is unavailable. Enable Google and configure its credentials in Cloud Auth Settings.');}if(popup)popup.location.assign(data.url);else window.location.assign(data.url);});
}
export const authService={
 login:(email:string,password:string)=>supabase.auth.signInWithPassword({email,password}).then(({error})=>{if(error)throw error;}),
 sendOtp:(email:string)=>supabase.auth.signInWithOtp({email,options:{shouldCreateUser:true}}).then(({error})=>{if(error)throw error;}),
 verify:(email:string,token:string,password:string,name:string)=>supabase.auth.verifyOtp({email,token,type:'email'}).then(({error})=>{if(error)throw error;return supabase.auth.updateUser({password,data:{username:name}});}).then(({error})=>{if(error)throw error;}),
 recover:(email:string)=>supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/auth/callback?next=reset`}).then(({error})=>{if(error)throw error;}),
 password:(password:string)=>supabase.auth.updateUser({password}).then(({error})=>{if(error)throw error;}),
 logout:()=>supabase.auth.signOut().then(({error})=>{if(error)throw error;}),
};
