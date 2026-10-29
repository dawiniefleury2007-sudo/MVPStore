-- Transactional operations; only the Edge service role can supply p_user after validating its JWT.
create or replace function public.mvp_entitled(p_user uuid,p_product uuid default null) returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from license_activations a join licenses l on l.id=a.license_id join subscriptions s on s.activation_id=a.id left join reseller_access r on r.id=l.reseller_access_id where a.user_id=p_user and (p_product is null or a.product_id=p_product) and l.status in ('active','redeemed') and s.status='active' and (a.expires_at is null or a.expires_at>now()) and (r.id is null or (case when r.status='active' then r.ends_at+interval '15 days' else coalesce(r.grace_until,r.updated_at+interval '15 days') end)>now()));$$;
create or replace function public.mvp_rate(p_user uuid,p_action text,p_limit integer default 60) returns void language plpgsql security definer set search_path=public as $$declare n integer; begin insert into rate_limits(user_id,action,window_start) values(p_user,p_action,date_trunc('minute',now())) on conflict(user_id,action,window_start) do update set hits=rate_limits.hits+1 returning hits into n; if n>p_limit then raise exception 'Too many requests. Wait a minute.'; end if; end;$$;
create or replace function public.mvp_action(p_user uuid,p_action text,p jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare admin boolean:=mvp_is_admin(p_user); l licenses; a license_activations; r reseller_access; o orders; plan product_plans; ct xp_claim_types; last_claim timestamptz; entity uuid; secret text; keys jsonb:='[]'; duration bigint; qty integer; lim integer; n integer; prod uuid; path text; target uuid; result jsonb:='{}';
begin
if not exists(select 1 from user_profiles where id=p_user) then raise exception 'Authentication required'; end if;
if p_action like 'admin.%' and not admin then raise exception 'Administrator access required'; end if;
if p_action='license.create' then
 qty:=coalesce((p->>'amount')::integer,1); lim:=coalesce((p->>'activationLimit')::integer,1); duration:=(p->>'durationSeconds')::bigint; prod:=(p->>'productId')::uuid;
 if qty not between 1 and 100 or lim not between 1 and 100 or (duration is not null and duration not between 1 and 315360000) then raise exception 'Invalid license limits'; end if;
 if not exists(select 1 from products where id=prod and available) then raise exception 'Product unavailable'; end if;
 if not admin then select * into r from reseller_access where user_id=p_user and status='active' and starts_at<=now() and ends_at>now() order by ends_at desc limit 1 for update;
 if r.id is null then raise exception 'Active reseller access required'; end if;
 if not(prod=any(r.allowed_products)) or qty>r.max_quantity or lim<>1 or (duration is null and not r.allow_lifetime) or duration>r.max_duration_seconds or (select count(*) from licenses where reseller_access_id=r.id)+qty>r.quota then raise exception 'Reseller product, duration or quota restriction'; end if; end if;
 for n in 1..qty loop secret:='MVP-'||encode(gen_random_bytes(16),'hex'); insert into licenses(key_hash,key_hint,product_id,creator_id,reseller_access_id,duration_seconds,activation_limit,note,redeem_before) values(encode(digest(secret,'sha256'),'hex'),left(secret,8)||'…'||right(secret,4),prod,p_user,r.id,duration,lim,left(coalesce(p->>'note',''),1000),(p->>'redeemBefore')::timestamptz) returning id into entity; keys:=keys||jsonb_build_array(jsonb_build_object('id',entity,'key',secret)); end loop;
 result:=jsonb_build_object('keys',keys);
elsif p_action='license.redeem' then
 if p ? 'licenseId' then select * into l from licenses where id=(p->>'licenseId')::uuid and owner_id=p_user for update; else select * into l from licenses where key_hash=encode(digest(trim(p->>'key'),'sha256'),'hex') for update; end if;
 if l.id is null then raise exception 'Invalid license'; end if;
 if l.status not in ('available','active') then raise exception 'License is banned, revoked or expired'; end if;
 if l.owner_id is not null and l.owner_id<>p_user then raise exception 'License assigned to a different account'; end if;
 if l.activation_count>=l.activation_limit or exists(select 1 from license_activations where license_id=l.id and user_id=p_user) then raise exception 'License already redeemed'; end if;
 if l.redeem_before<=now() then raise exception 'License redemption window expired'; end if;
 if not exists(select 1 from products where id=l.product_id and available) then raise exception 'Product unavailable'; end if;
 if l.reseller_access_id is not null then select * into r from reseller_access where id=l.reseller_access_id; if (case when r.status='active' then r.ends_at+interval '15 days' else coalesce(r.grace_until,r.updated_at+interval '15 days') end)<=now() then raise exception 'Reseller license suspended after 15-day grace'; end if; end if;
 insert into license_activations(license_id,user_id,product_id,expires_at) values(l.id,p_user,l.product_id,case when l.duration_seconds is null then null else now()+l.duration_seconds*interval '1 second' end) returning * into a;
 update licenses set activation_count=activation_count+1,status=case when activation_count+1>=activation_limit then 'redeemed' else 'active' end where id=l.id;
 insert into subscriptions(user_id,product_id,activation_id,expires_at) values(p_user,l.product_id,a.id,a.expires_at); entity:=l.id; result:=jsonb_build_object('activationId',a.id,'expires',a.expires_at);
elsif p_action='license.status' then
 select * into l from licenses where id=(p->>'id')::uuid for update;
 if l.id is null or (not admin and (l.creator_id<>p_user or not mvp_active_reseller(p_user))) then raise exception 'License access denied'; end if;
 if p->>'status' not in ('banned','unbanned','revoked','expired') or (not admin and p->>'status' in ('revoked','expired')) then raise exception 'Invalid status'; end if;
 if p->>'status'='unbanned' then if l.status<>'banned' then raise exception 'Only banned licenses can be unbanned'; end if; update licenses set status=coalesce(prior_status,'available'),ban_reason=null where id=l.id;
 else update licenses set prior_status=case when status='banned' then prior_status else status end,status=p->>'status',ban_reason=left(coalesce(p->>'reason',''),500) where id=l.id; end if; entity:=l.id;
elsif p_action='xp.claim' then
 insert into xp_accounts(user_id) values(p_user) on conflict do nothing; perform 1 from xp_accounts where user_id=p_user for update;
 if exists(select 1 from xp_claims where user_id=p_user and idempotency_key=(p->>'idempotencyKey')::uuid) then return jsonb_build_object('alreadyProcessed',true); end if;
 select * into ct from xp_claim_types where id=p->>'source' and enabled;
 if ct.id is null then raise exception 'Invalid claim action'; end if;
 select max(created_at) into last_claim from xp_claims where user_id=p_user and source=ct.id;
 if last_claim+ct.cooldown_seconds*interval '1 second'>now() then raise exception 'Reward cooldown has not finished'; end if;
 insert into xp_claims(user_id,source,reward,idempotency_key) values(p_user,ct.id,ct.reward,(p->>'idempotencyKey')::uuid);
 update xp_accounts set balance=balance+ct.reward,total_earned=total_earned+ct.reward where user_id=p_user; result:=jsonb_build_object('reward',ct.reward);
elsif p_action='order.submit' then
 perform pg_advisory_xact_lock(hashtextextended(p->>'idempotencyKey',0)); select * into o from orders where idempotency_key=(p->>'idempotencyKey')::uuid;
 if o.id is not null then if o.user_id<>p_user then raise exception 'Order access denied'; end if; return jsonb_build_object('id',o.id); end if;
 select * into plan from product_plans where id=(p->>'planId')::uuid;
 if plan.id is null or not exists(select 1 from products where id=plan.product_id and available) then raise exception 'Plan unavailable'; end if;
 path:=p->>'proof'; if split_part(path,'/',1)<>p_user::text or not exists(select 1 from storage.objects where bucket_id='mvp-proofs' and name=path) then raise exception 'Upload a valid payment proof'; end if;
 if not exists(select 1 from store_settings where id='payments' and length(value->>case when p->>'method'='PayPal' then 'paypalUrl' else 'cashappUrl' end)>0) then raise exception 'Payment destination unavailable'; end if;
 insert into orders(user_id,amount_cents,proof_path,notes,method,idempotency_key) values(p_user,plan.price_cents,path,coalesce(p->>'notes',''),p->>'method',(p->>'idempotencyKey')::uuid) returning id into entity;
 insert into order_items(order_id,product_id,plan_id,unit_price_cents) values(entity,plan.product_id,plan.id,plan.price_cents); result:=jsonb_build_object('id',entity);
elsif p_action='admin.order.review' then
 select * into o from orders where id=(p->>'id')::uuid for update; if o.id is null or o.status<>'pending' then raise exception 'Order already reviewed or not found'; end if;
 if p->>'decision'='approve' then
 select * into l from licenses where id=(p->>'licenseId')::uuid for update;
 select pp.* into plan from order_items i join product_plans pp on pp.id=i.plan_id where i.order_id=o.id;
 if l.id is null or l.status<>'available' or l.owner_id is not null or l.activation_limit<>1 or l.activation_count<>0 or l.product_id<>plan.product_id or l.duration_seconds is distinct from plan.duration_seconds then raise exception 'Select an available matching product and duration license'; end if;
 update licenses set owner_id=o.user_id where id=l.id; update order_items set license_id=l.id where order_id=o.id;
 update orders set status='fulfilled',reviewed_by=p_user,reviewed_at=now() where id=o.id;
 else if p->>'decision'<>'reject' then raise exception 'Invalid review'; end if; update orders set status='failed',reviewed_by=p_user,reviewed_at=now(),rejection_reason=left(coalesce(p->>'reason','Payment not verified'),500) where id=o.id; end if;
 insert into notifications(user_id,title,body,event_key) values(o.user_id,case when p->>'decision'='approve' then 'Order approved' else 'Order rejected' end,case when p->>'decision'='approve' then 'Your assigned product access can be activated from Orders.' else coalesce(p->>'reason','Payment not verified') end,'order:'||o.id) on conflict do nothing; entity:=o.id;
elsif p_action='profile.save' then
 if length(trim(p->>'name')) not between 2 and 80 then raise exception 'Display name must be 2–80 characters'; end if;
 if p->>'avatarPath' is not null then path:=p->>'avatarPath'; if split_part(path,'/',1)<>p_user::text or not exists(select 1 from storage.objects where bucket_id='mvp-avatars' and name=path) then raise exception 'Invalid avatar'; end if; end if;
 update user_profiles set username=trim(p->>'name'),avatar_url=coalesce(p->>'avatarUrl',avatar_url) where id=p_user;
elsif p_action='feedback.publish' then
 path:=p->>'imagePath'; if split_part(path,'/',1)<>p_user::text or not exists(select 1 from storage.objects where bucket_id='mvp-feedback' and name=path) then raise exception 'Upload a feedback image'; end if;
 if p->>'type'='product' and not mvp_entitled(p_user,(p->>'productId')::uuid) then raise exception 'Active product access required for product feedback'; end if;
 insert into feedback(user_id,product_id,type,title,image_path) values(p_user,(p->>'productId')::uuid,p->>'type',coalesce(p->>'title',''),path) returning id into entity;
elsif p_action in ('feedback.like','feedback.reply','feedback.report','feedback.delete','admin.feedback.moderate') then
 select id into entity from feedback where id=(p->>'id')::uuid and (status='published' or admin) for update; if entity is null then raise exception 'Feedback not found'; end if;
 if p_action='feedback.like' then if (p->>'liked')::boolean then insert into feedback_likes(feedback_id,user_id) values(entity,p_user) on conflict do nothing; else delete from feedback_likes where feedback_id=entity and user_id=p_user; end if;
 elsif p_action='feedback.reply' then insert into feedback_replies(feedback_id,user_id,body) values(entity,p_user,trim(p->>'body'));
 elsif p_action='feedback.report' then insert into feedback_reports(feedback_id,user_id,reason) values(entity,p_user,p->>'reason') on conflict do nothing;
 else if not admin and not exists(select 1 from feedback where id=entity and user_id=p_user) then raise exception 'Feedback ownership required'; end if; update feedback set status=case when p_action='feedback.delete' then 'deleted' else 'hidden' end where id=entity; end if;
elsif p_action='notification.read' then update notifications set read_at=now() where id=(p->>'id')::uuid and user_id=p_user;
elsif p_action='contact.submit' then
 path:=p->>'imagePath'; if path is not null and (split_part(path,'/',1)<>p_user::text or not exists(select 1 from storage.objects where bucket_id='mvp-contact' and name=path)) then raise exception 'Invalid contact image'; end if;
 insert into contact_messages(user_id,email,name,message,image_path) select p_user,email,p->>'name',p->>'message',path from user_profiles where id=p_user returning id into entity;
elsif p_action='admin.product.save' then
 if p ? 'id' then update products set name=p->>'name',description=p->>'description',image=p->>'image',category=p->>'category',available=coalesce((p->>'available')::boolean,true) where id=(p->>'id')::uuid returning id into entity;
 else insert into products(name,description,image,category,created_by) values(p->>'name',p->>'description',p->>'image',p->>'category',p_user) returning id into entity; end if;
 if p ? 'planName' then insert into product_plans(product_id,name,duration_seconds,price_cents) values(entity,p->>'planName',(p->>'days')::bigint*86400,round((p->>'price')::numeric*100)); end if;
elsif p_action='admin.plan.add' then insert into product_plans(product_id,name,duration_seconds,price_cents) values((p->>'productId')::uuid,p->>'name',(p->>'days')::bigint*86400,round((p->>'price')::numeric*100));
elsif p_action='admin.payments.save' then
 if coalesce(p->>'paypalUrl','') not like 'https://%' and coalesce(p->>'paypalUrl','')<>'' or coalesce(p->>'cashappUrl','') not like 'https://%' and coalesce(p->>'cashappUrl','')<>'' then raise exception 'Use HTTPS payment URLs'; end if;
 insert into store_settings(id,value) values('payments',p) on conflict(id) do update set value=excluded.value;
elsif p_action='admin.file.save' then
 path:=p->>'storagePath'; if p->>'kind'='product' and (split_part(path,'/',1)<>p_user::text or not exists(select 1 from storage.objects where bucket_id='mvp-private' and name=path)) then raise exception 'Upload a private product file'; end if;
 insert into product_files(product_id,name,image,kind,storage_path,external_url,created_by) values((p->>'productId')::uuid,p->>'name',p->>'image',p->>'kind',path,p->>'url',p_user) returning id into entity;
elsif p_action='admin.file.disable' then update product_files set enabled=false where id=(p->>'id')::uuid returning id into entity;
elsif p_action='admin.team.add' then insert into team_members(name,role,image,discord_url) values(p->>'name',p->>'role',p->>'image',p->>'discordUrl') returning id into entity;
elsif p_action='admin.xp.configure' then insert into xp_claim_types(id,name,reward,cooldown_seconds,enabled) values(p->>'id',p->>'name',(p->>'reward')::integer,(p->>'cooldownSeconds')::integer,coalesce((p->>'enabled')::boolean,true)) on conflict(id) do update set name=excluded.name,reward=excluded.reward,cooldown_seconds=excluded.cooldown_seconds,enabled=excluded.enabled;
elsif p_action='admin.reseller.grant' then
 secret:=null; if p->>'mode'='key' then secret:='MVP-RSL-'||encode(gen_random_bytes(16),'hex'); end if;
 target:=(p->>'userId')::uuid; if secret is null and target is null then raise exception 'Select a user'; end if;
 insert into reseller_access(user_id,access_type,starts_at,ends_at,granted_by,key_hash,key_hint,allowed_products,quota,max_quantity,max_duration_seconds,allow_lifetime) values(case when secret is null then target else null end,p->>'accessType',(p->>'startsAt')::timestamptz,(p->>'endsAt')::timestamptz,p_user,case when secret is null then null else encode(digest(secret,'sha256'),'hex') end,case when secret is null then null else left(secret,12)||'…'||right(secret,4) end,array(select jsonb_array_elements_text(p->'products')::uuid),(p->>'quota')::integer,(p->>'maxQuantity')::integer,(p->>'maxDurationSeconds')::bigint,coalesce((p->>'allowLifetime')::boolean,false)) returning id into entity; result:=jsonb_build_object('key',secret);
elsif p_action='reseller.redeem' then
 select * into r from reseller_access where key_hash=encode(digest(trim(p->>'key'),'sha256'),'hex') for update;
 if r.id is null or r.user_id is not null or r.status<>'active' or r.ends_at<=now() or r.starts_at>now() then raise exception 'Invalid, used or expired reseller access key'; end if;
 update reseller_access set user_id=p_user,redeemed_at=now() where id=r.id; entity:=r.id;
elsif p_action='admin.reseller.status' then
 select * into r from reseller_access where id=(p->>'id')::uuid for update; if r.id is null or p->>'status' not in ('active','suspended','revoked') then raise exception 'Invalid reseller status'; end if;
 update reseller_access set status=p->>'status',ends_at=coalesce((p->>'endsAt')::timestamptz,ends_at),grace_until=case when p->>'status'='active' then null else now()+interval '15 days' end where id=r.id; entity:=r.id;
else raise exception 'Unsupported action'; end if;
insert into activity_events(user_id,action) values(p_user,p_action);
if admin or p_action like 'license.%' or p_action like 'reseller.%' then insert into audit_logs(actor_id,action,entity_id) values(p_user,p_action,entity); end if;
return result;
end;$$;
revoke all on function public.mvp_entitled(uuid,uuid),public.mvp_rate(uuid,text,integer),public.mvp_action(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.mvp_entitled(uuid,uuid),public.mvp_rate(uuid,text,integer),public.mvp_action(uuid,text,jsonb) to service_role;
