-- Final server-only hardening, indexed directory search, and explicit publication notifications.
create or replace function public.mvp_search_users(p_user uuid,p_prefix text,p_page integer default 0) returns jsonb language plpgsql stable security definer set search_path=public as $$declare result jsonb; escaped text; begin
if not mvp_is_admin(p_user) then raise exception 'Administrator access required'; end if;
if length(trim(p_prefix)) not between 2 and 80 then return '[]'; end if;
escaped:=replace(replace(replace(lower(trim(p_prefix)),chr(92),chr(92)||chr(92)),'%',chr(92)||'%'),'_',chr(92)||'_');
select coalesce(jsonb_agg(to_jsonb(u)),'[]') into result from (select id,username,avatar_url from user_profiles where lower(username) like escaped||'%' escape E'\\' order by lower(username),id offset greatest(0,least(p_page,10000))*20 limit 20) u; return result; end;$$;
create or replace function public.mvp_file_notice() returns trigger language plpgsql security definer set search_path=public as $$begin
insert into notifications(user_id,title,body,event_key) select distinct a.user_id,'New download available',new.name||' has been published in MVP Panel.','file:'||new.id from license_activations a where (new.product_id is null or a.product_id=new.product_id) and mvp_entitled(a.user_id,new.product_id) on conflict do nothing; return new; end;$$;
do $$begin if not exists(select 1 from pg_trigger where tgname='mvp_file_notice') then create trigger mvp_file_notice after insert on public.product_files for each row execute function public.mvp_file_notice(); end if; end;$$;
create or replace function public.mvp_expire_notice() returns trigger language plpgsql security definer set search_path=public as $$begin if new.status='expired' and old.status<>'expired' then insert into audit_logs(action,entity_id,detail) values('subscription.auto_expired',new.id,jsonb_build_object('userId',new.user_id)); end if; return new; end;$$;
do $$begin if not exists(select 1 from pg_trigger where tgname='mvp_expire_notice') then create trigger mvp_expire_notice after update on public.subscriptions for each row execute function public.mvp_expire_notice(); end if; end;$$;
-- Guard reseller grants so repeated suspension does not reset a 15-day grace clock.
create or replace function public.mvp_reseller_grace() returns trigger language plpgsql set search_path=public as $$begin if new.status in ('suspended','revoked') and old.status in ('suspended','revoked') then new.grace_until=old.grace_until; end if; return new; end;$$;
do $$begin if not exists(select 1 from pg_trigger where tgname='mvp_reseller_grace') then create trigger mvp_reseller_grace before update on public.reseller_access for each row execute function public.mvp_reseller_grace(); end if; end;$$;
revoke all on function public.mvp_search_users(uuid,text,integer),public.mvp_file_notice(),public.mvp_expire_notice(),public.mvp_reseller_grace() from public,anon,authenticated;
grant execute on function public.mvp_search_users(uuid,text,integer) to service_role;
-- Existing platform defaults grant server reads; make that contract explicit without granting browser access.
grant select,insert,update,delete on all tables in schema public to service_role;
revoke update,delete,truncate on public.audit_logs from anon,authenticated,service_role;
