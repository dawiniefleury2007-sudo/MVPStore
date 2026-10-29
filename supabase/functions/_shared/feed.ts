import { backend, rpc } from './backend.ts';
import { signedImage } from './storage.ts';
export async function feed(userId:string|null,page:number,productId?:string) {
 let query=backend.from('feedback').select('id,user_id,product_id,type,title,image_path,created_at,user_profiles(username,avatar_url),feedback_likes(user_id),feedback_replies(id,user_id,body,created_at,user_profiles(username,avatar_url))').eq('status','published').order('created_at',{ascending:false}).range(page*20,page*20+19);
 if(productId)query=query.eq('product_id',productId);
 const {data,error}=await query;if(error)throw new Error('Unable to load feedback');
 return Promise.all((data||[]).map(async f=>({...f,image:await signedImage('mvp-feedback',f.image_path),image_path:undefined,author:f.user_profiles,likes:f.feedback_likes.length,liked:f.feedback_likes.some((x:{user_id:string})=>x.user_id===userId),feedback_likes:undefined,user_profiles:undefined,replies:f.feedback_replies,feedback_replies:undefined})));
}
export async function leaderboard(page:number) {
 const {data,error}=await backend.from('xp_accounts').select('user_id,balance,total_earned,user_profiles(username,avatar_url)').order('balance',{ascending:false}).order('user_id').range(page*25,page*25+24);if(error)throw new Error('Unable to load leaderboard');return data;
}
export async function searchUsers(id:string,prefix:string,page:number) {
 return rpc('mvp_search_users',{p_user:id,p_prefix:prefix,p_page:page});
}
