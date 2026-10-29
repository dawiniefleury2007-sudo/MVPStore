import { corsHeaders,json } from '../_shared/cors.ts';
import { backend,identity,rpc,isAdmin,activeReseller,rows } from '../_shared/backend.ts';
import { snapshot } from '../_shared/snapshot.ts';
import { feed,leaderboard,searchUsers } from '../_shared/feed.ts';
import { issueUpload,validateImage,download } from '../_shared/storage.ts';
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try {
  if(Number(req.headers.get('content-length')||0)>100000)return json({error:'Request too large'},413);
  const text=await req.text();if(text.length>100000)return json({error:'Request too large'},413);
  const body=JSON.parse(text);const op=String(body.operation);const p:Record<string,unknown>=body.payload&&typeof body.payload==='object'&&!Array.isArray(body.payload)?body.payload:{};
  const publicOp=['snapshot','feed','team'].includes(op);const user=await identity(req,publicOp);
  if(user)await rpc('mvp_rate',{p_user:user.id,p_action:op,p_limit:op==='search'?30:60});
  console.log('MVP operation',op,'authenticated',Boolean(user));
  if(op==='snapshot')return json(await snapshot(user?.id||null));
  if(op==='feed')return json(await feed(user?.id||null,Math.max(0,Math.min(Number(body.page)||0,10000)),body.productId));
  if(op==='team')return json(await rows('team_members','id,name,role,image,discord_url'));
  if(!user)throw new Error('Authentication required');
  if(op==='leaderboard')return json(await leaderboard(Math.max(0,Number(body.page)||0)));
  if(op==='search')return json(await searchUsers(user.id,String(body.prefix||'').trim(),Math.max(0,Number(body.page)||0)));
  if(op==='resellers'||op==='contacts') {if(!await isAdmin(user.id))throw new Error('Administrator access required');const page=Math.max(0,Math.min(Number(body.page)||0,10000));const {data,error}=await backend.from(op==='resellers'?'reseller_access':'contact_messages').select(op==='resellers'?'id,user_id,access_type,starts_at,ends_at,status,allowed_products,quota,max_quantity,max_duration_seconds,allow_lifetime':'id,name,email,message,created_at').order('created_at',{ascending:false}).range(page*50,page*50+49);if(error)throw new Error('Unable to load records');return json(data);}
  if(op==='analytics') {if(!await isAdmin(user.id)&&!await activeReseller(user.id))throw new Error('Access denied');return json(await rpc('mvp_analytics',{p_user:user.id,p_days:Math.max(1,Math.min(Number(body.days)||7,90))}));}
  if(op==='history'){const {data:l,error}=await backend.from('licenses').select('id,creator_id').eq('id',String(body.id)).single();if(error||!l||(!await isAdmin(user.id)&&(l.creator_id!==user.id||!await activeReseller(user.id))))throw new Error('License access denied');const {data,error:historyError}=await backend.from('license_activations').select('id,activated_at,expires_at,build_id,user_profiles(username,avatar_url)').eq('license_id',l.id).order('activated_at',{ascending:false}).limit(100);if(historyError)throw new Error('Unable to load activation history');return json(data);}
  if(op==='upload')return json(await issueUpload(user.id,p));
  if(op==='download')return json(await download(user.id,String(body.id)));
  if(op==='action') {
   const action=String(body.action);
   if(action.startsWith('admin.')&&!await isAdmin(user.id))throw new Error('Administrator access required');
   const imageAction:{[key:string]:[string,string]}={'profile.save':['mvp-avatars','avatarPath'],'order.submit':['mvp-proofs','proof'],'feedback.publish':['mvp-feedback','imagePath'],'contact.submit':['mvp-contact','imagePath']};
   const image=imageAction[action];if(image&&p[image[1]])await validateImage(user.id,image[0],String(p[image[1]]));
   if(action==='profile.save'){delete p.avatarUrl;if(p.avatarPath)p.avatarUrl=backend.storage.from('mvp-avatars').getPublicUrl(String(p.avatarPath)).data.publicUrl;}
   const result=await rpc('mvp_action',{p_user:user.id,p_action:action,p});
   return json(result);
  }
  return json({error:'Unknown operation'},400);
 } catch(error) {const message=error instanceof Error?error.message:'Request failed';console.error('MVP request failed',message.slice(0,160));return json({error:message},message.includes('Authentication')?401:message.includes('access')||message.includes('Administrator')?403:400);}
});
