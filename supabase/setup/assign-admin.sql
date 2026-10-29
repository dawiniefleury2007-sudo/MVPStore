-- TRUSTED OPERATOR ONLY. Never deploy as an automatic migration or call from browser code.
-- Replace the UUID below with the exact ID of the email-verified account shown in Cloud > Users.
-- Registration using mvp-cheats@admin.com DOES NOT assign a role.
do $$declare target uuid := '00000000-0000-0000-0000-000000000000'; begin
if target='00000000-0000-0000-0000-000000000000'::uuid then raise exception 'Replace target with the verified administrator UUID'; end if;
if not exists(select 1 from auth.users where id=target and lower(email)='mvp-cheats@admin.com' and email_confirmed_at is not null) then raise exception 'Expected verified administrator account not found'; end if;
insert into public.user_roles(user_id,role) values(target,'admin') on conflict(user_id) do update set role='admin';
insert into public.audit_logs(actor_id,action,entity_id,detail) values(null,'operator.admin_bootstrap',target,jsonb_build_object('method','trusted SQL by verified UUID'));
end;$$;
