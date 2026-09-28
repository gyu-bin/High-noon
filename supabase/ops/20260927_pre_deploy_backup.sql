-- HIGH NOON — PRE-DEPLOY BACKUP (READ-ONLY, single SELECT)
-- Run in Supabase SQL Editor BEFORE 20260927_reconcile_bounty_ranking_v3.sql.
-- Download the result as CSV and keep it with the deployment record.
--
-- Why: the donor-era RPC bodies on the remote (pvp_matchmake, pvp_submit_match,
-- pvp_leaderboard, pvp_login_device, ...) are not in git. This output is the only
-- way to restore their exact behaviour if the migration has to be reverted.
-- The profiles fingerprint lets you prove rating / wins / losses are unchanged.
select * from (
  -- 1. every public function body
  select 1 as ord, 'function_def'::text as section,
         p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as object,
         pg_get_functiondef(p.oid) as detail
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.prokind in ('f', 'p')

  -- 2. function ACLs (who may EXECUTE)
  union all
  select 2, 'function_acl',
         p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         coalesce(p.proacl::text, '(default: PUBLIC execute)')
         || ' | secdef=' || p.prosecdef
         || ' | config=' || coalesce(array_to_string(p.proconfig, ';'), '')
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.prokind in ('f', 'p')

  -- 3. RLS policies, full text
  union all
  select 3, 'policy', pol.tablename || '.' || pol.policyname,
         'permissive=' || pol.permissive || ' cmd=' || pol.cmd
         || ' roles=' || array_to_string(pol.roles, ',')
         || ' using=' || coalesce(pol.qual, '') || ' check=' || coalesce(pol.with_check, '')
  from pg_policies pol
  where pol.schemaname = 'public'

  -- 4. table ACLs + RLS flags
  union all
  select 4, 'table_acl', c.relname::text,
         coalesce(c.relacl::text, '(default)')
         || ' | rls=' || c.relrowsecurity || ' forced=' || c.relforcerowsecurity
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'S')

  -- 5. columns
  union all
  select 5, 'column', c.relname || '.' || a.attname,
         format_type(a.atttypid, a.atttypmod)
         || case when a.attnotnull then ' NOT NULL' else ' NULL' end
         || coalesce(' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid), '')
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
    and a.attnum > 0 and not a.attisdropped

  -- 6. constraints
  union all
  select 6, 'constraint', con.conrelid::regclass::text || '.' || con.conname,
         pg_get_constraintdef(con.oid)
  from pg_constraint con
  where con.connamespace = 'public'::regnamespace

  -- 7. indexes
  union all
  select 7, 'index', i.tablename || '.' || i.indexname, i.indexdef
  from pg_indexes i
  where i.schemaname = 'public'

  -- 8. data fingerprints (compare with the post-deploy verification output)
  union all
  select 8, 'fingerprint', 'profiles',
         'rows=' || count(*) || ' md5=' || coalesce(md5(string_agg(
           id::text || '|' || display_name || '|' || rating || '|' || wins || '|' || losses,
           ',' order by id)), '-')
  from public.profiles
  union all
  select 8, 'fingerprint', 'device_identities', 'rows=' || count(*)
  from public.device_identities
) backup
order by ord, object;
