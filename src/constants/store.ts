import artwork from '@/assets/mvp-showcase.webp';
import type { Product, StoreData } from '@/types/store';
export const LOGO='https://cdn.discordapp.com/icons/1354751187492016210/858778f3ee8e15a4be032011e5da2ee6.webp?size=1024';
export const BANNER='https://cdn.discordapp.com/banners/1354751187492016210/a_59933c54991fd6b6afcbfa43d468eb7c.webp?size=480&animated=true';
export const CHARACTER='https://blazexiters.in/hero/blaze-character.png?v=pictures';
export const CATEGORIES=['aimkill','silent cover','bypass emulator','uid bypass','ultra core'];
export const PRODUCTS:Product[]=CATEGORIES.map((category,i)=>({id:category.replace(/ /g,'-'),category,name:['AimKill','Silent Cover','Emulator Bypass','UID Bypass','Ultra Core'][i],description:['Precision meets performance. A streamlined panel designed for your everyday setup.','A focused, lightweight experience with consistent performance and simple setup.','Your emulator companion. Straightforward configuration and an optimized experience.','A dedicated UID utility with a clean interface and effortless configuration.','The complete MVP experience. Every essential, together in one powerful panel.'][i],image:artwork,tag:['POPULAR','NEW','UTILITY','ESSENTIAL','PREMIUM'][i],plans:[{name:'7 Days',days:7,price:3.49+i},{name:'14 Days',days:14,price:5.99+i},{name:'30 Days',days:30,price:9.99+i*2}]}));
export const INITIAL_DATA:StoreData={users:[],products:PRODUCTS,licenses:[],orders:[],files:[],logs:[],payments:{paypalName:'',paypalUrl:'',cashappName:'',cashappUrl:''}};
export const uid=()=>crypto.randomUUID();
export const dateLabel=(value:string)=>new Date(value).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
export const money=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
export const daysLeft=(value?:string)=>value?Math.max(0,Math.ceil((new Date(value).getTime()-Date.now())/86400000)):0;
export function generateKey(mask:string,lower:boolean,upper:boolean){const chars='0123456789'+(lower?'abcdefghijklmnopqrstuvwxyz':'')+(upper?'ABCDEFGHIJKLMNOPQRSTUVWXYZ':'');return mask.replace(/\*/g,()=>chars[crypto.getRandomValues(new Uint32Array(1))[0]%chars.length]);}
