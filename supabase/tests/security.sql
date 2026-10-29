-- Read-only checks, safe in production. Raises if a browser role has privileged access.
do $$begin
if exists(select 1 from pg_tables where schemaname='public' and not rowsecurity) then raise exception 'RLS missing'; end if;
if has_function_privilege('authenticated','public.mvp_action(uuid,text,jsonb)','execute') then raise exception 'Browser can call privileged RPC'; end if;
if has_function_privilege('anon','public.mvp_action(uuid,text,jsonb)','execute') then raise exception 'Anonymous privileged RPC access'; end if;
if has_table_privilege('authenticated','public.user_roles','insert') then raise exception 'Role escalation possible'; end if;
if has_table_privilege('authenticated','public.xp_accounts','update') then raise exception 'XP tampering possible'; end if;
if has_table_privilege('anon','public.licenses','select') then raise exception 'License hashes exposed'; end if;
if has_table_privilege('authenticated','public.audit_logs','update') then raise exception 'Audit tampering possible'; end if;
if exists(select 1 from storage.buckets where id in ('mvp-private','mvp-proofs','mvp-feedback','mvp-contact') and public) then raise exception 'Private bucket exposed'; end if;
end;$$;
