export interface User { id:string; name:string; email:string; role:'client'|'reseller'|'admin'; xp:number; totalEarned:number; balance:number; lastActive:string; lastClaim?:string; avatar?:string; }
export interface Plan { id?:string; name:string; days:number; price:number; }
export interface Product { id:string; name:string; description:string; image:string; category:string; plans:Plan[]; tag:string; available?:boolean; }
export interface License { id:string; key:string; productId:string; days:number; status:'unused'|'active'|'banned'|'expired'|'revoked'; created:string; creatorId?:string; userId?:string; activated?:string; expires?:string; loaderKey?:string; buildId?:string; resets:number; note:string; banReason?:string; entitled?:boolean; assigned?:boolean; activationLimit?:number; activationCount?:number; }
export interface Order { id:string; userId:string; productId:string; plan:Plan; amount:number; date:string; status:'pending'|'completed'|'rejected'; proof:string; notes:string; method:string; licenseId?:string; reference?:string; key?:string; }
export interface StoreFile { id:string; name:string; productId:string; image:string; url:string; type:'product'|'setup'; date:string; }
export interface EventLog { id:string; time:string; actor:string; action:string; detail:string; }
export interface PaymentSettings { paypalName:string; paypalUrl:string; cashappName:string; cashappUrl:string; }
export interface Claim {id:string;source:string;reward:number;created_at:string;}
export interface ClaimType {id:string;name:string;reward:number;cooldown_seconds:number;enabled:boolean;}
export interface Notification {id:string;title:string;body:string;created_at:string;read_at?:string;}
export interface ResellerAccess {id:string;user_id?:string;access_type:string;starts_at:string;ends_at:string;status:string;allowed_products:string[];quota:number;max_quantity:number;max_duration_seconds:number;allow_lifetime:boolean;}
export interface Metrics {users:number;licenses:number;active:number;banned:number;expired:number;unusedUsers:number;}
export interface StoreData { users:User[]; products:Product[]; licenses:License[]; orders:Order[]; files:StoreFile[]; logs:EventLog[]; payments:PaymentSettings; claims:Claim[]; claimTypes:ClaimType[]; notifications:Notification[]; reseller?:ResellerAccess; metrics:Metrics; serverTime:string; }
export interface Snapshot {data:StoreData;user?:User;}
