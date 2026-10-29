export interface PublicAuthor {username:string;avatar_url?:string;}
export interface Reply {id:string;user_id:string;body:string;created_at:string;user_profiles:PublicAuthor;}
export interface FeedbackPost {id:string;user_id:string;product_id?:string;type:string;title:string;image:string;created_at:string;author:PublicAuthor;likes:number;liked:boolean;replies:Reply[];}
export interface LeaderEntry {user_id:string;balance:number;total_earned:number;user_profiles:PublicAuthor;}
