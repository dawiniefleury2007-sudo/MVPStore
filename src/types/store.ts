export interface User { id:string; name:string; email:string; password:string; role:'client'|'reseller'|'admin'; xp:number; balance:number; lastActive:string; lastClaim?:string; }
export interface Plan { name:string; days:number; price:number; }
export interface Product { id:string; name:string; description:string; image:string; category:string; plans:Plan[]; tag:string; }
export interface License { id:string; key:string; productId:string; days:number; status:'unused'|'active'|'banned'; created:string; userId?:string; activated?:string; expires?:string; loaderKey?:string; buildId?:string; resets:number; note:string; banReason?:string; }
export interface Order { id:string; userId:string; productId:string; plan:Plan; amount:number; date:string; status:'pending'|'completed'|'rejected'; proof:string; notes:string; method:string; key?:string; }
export interface StoreFile { id:string; name:string; productId:string; image:string; url:string; type:'product'|'setup'; date:string; }
export interface EventLog { id:string; time:string; actor:string; action:string; detail:string; }
export interface PaymentSettings { paypalName:string; paypalUrl:string; cashappName:string; cashappUrl:string; }
export interface StoreData { users:User[]; products:Product[]; licenses:License[]; orders:Order[]; files:StoreFile[]; logs:EventLog[]; payments:PaymentSettings; }
