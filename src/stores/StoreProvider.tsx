import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { toast } from 'sonner';
import { INITIAL_DATA, uid, generateKey } from '@/constants/store';
import type { StoreData, User, License, EventLog } from '@/types/store';
interface StoreContextValue { data:StoreData; user:User|undefined; update:(fn:(data:StoreData)=>StoreData)=>void; log:(action:string,detail:string)=>void; authenticate:(email:string,password:string,name?:string)=>Promise<boolean>; signOut:()=>void; redeem:(key:string)=>void; claim:()=>void; }
const StoreContext=createContext<StoreContextValue|null>(null);
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');
export function StoreProvider({children}:{children:ReactNode}){
 const [data,setData]=useState<StoreData>(()=>JSON.parse(localStorage.getItem('mvp-store-v1')||'null')||INITIAL_DATA);
 const [userId,setUserId]=useState<string|null>(()=>localStorage.getItem('mvp-session'));
 const user=data.users.find(u=>u.id===userId);
 useEffect(()=>{localStorage.setItem('mvp-store-v1',JSON.stringify(data));},[data]);
 useEffect(()=>{const listener=(e:StorageEvent)=>{if(e.key==='mvp-store-v1'&&e.newValue)setData(JSON.parse(e.newValue));};window.addEventListener('storage',listener);return()=>window.removeEventListener('storage',listener);},[]);
 const update=(fn:(d:StoreData)=>StoreData)=>setData(fn);
 const makeLog=(action:string,detail:string,actor=user?.email||'Guest'):EventLog=>({id:uid(),time:new Date().toISOString(),actor,action,detail});
 const log=(action:string,detail:string)=>update(d=>({...d,logs:[makeLog(action,detail),...d.logs].slice(0,500)}));
 const authenticate=async(email:string,password:string,name?:string)=>{
  const normalized=email.trim().toLowerCase(), hashed=await hash(password);const found=data.users.find(u=>u.email===normalized);
  if(name&&found){toast.error('An account with this email already exists.');return false;}
  if(!name&&(!found||found.password!==hashed)){toast.error('Email or password is incorrect. Create an account first.');return false;}
  const account:User=found||{id:uid(),name:name||normalized.split('@')[0],email:normalized,password:hashed,role:normalized==='mvp-cheats@test.com'?'admin':'client',xp:0,balance:0,lastActive:new Date().toISOString()};
  update(d=>({...d,users:found?d.users.map(u=>u.id===account.id?{...u,lastActive:new Date().toISOString()}:u):[...d.users,account],logs:[makeLog(name?'Account created':'Signed in','Temporary local account',normalized),...d.logs]}));
  setUserId(account.id);localStorage.setItem('mvp-session',account.id);toast.success('Welcome to MVP Store');return true;
 };
 const signOut=()=>{log('Signed out','Session ended');setUserId(null);localStorage.removeItem('mvp-session');toast.success('Signed out');};
 const redeem=(key:string)=>{
  if(!user)return;const found=data.licenses.find(l=>l.key===key.trim());
  if(!found){toast.error('License not found. Check your key and try again.');return;}
  if(found.status!=='unused'){toast.error('This license is already used or banned.');return;}
  const now=new Date().toISOString();const activated:License={...found,status:'active',userId:user.id,activated:now,expires:new Date(Date.now()+found.days*86400000).toISOString(),buildId:generateKey('MVP-LDR-********',false,true)};
  update(d=>({...d,licenses:d.licenses.map(l=>l.id===found.id?activated:l),logs:[makeLog('License redeemed',found.key),...d.logs]}));toast.success('License activated. Your subscription starts now.');
 };
 const claim=()=>{if(!user)return;if(user.lastClaim&&Date.now()-new Date(user.lastClaim).getTime()<86400000){toast.error('Your next reward is available 24 hours after your last claim.');return;}update(d=>({...d,users:d.users.map(u=>u.id===user.id?{...u,xp:u.xp+500,lastClaim:new Date().toISOString()}:u),logs:[makeLog('Daily reward claimed','+500 XP'),...d.logs]}));toast.success('You earned 500 XP');};
 return <StoreContext.Provider value={{data,user,update,log,authenticate,signOut,redeem,claim}}>{children}</StoreContext.Provider>;
}
export function useStore(){const context=useContext(StoreContext);if(!context)throw new Error('StoreProvider is missing');return context;}
