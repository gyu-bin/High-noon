-- HIGH NOON — GHOST SNAPSHOT V2 POST-DEPLOY VERIFICATION (READ-ONLY, single SELECT)
-- Run right after 20260928_ghost_snapshot_v2.sql. Supersedes the client-RPC
-- allowlist of 20260927_post_deploy_verify.sql (which predates the V2 RPCs and
-- would report them as exposed). Includes every 20260927 check plus Ghost V2.
-- Expect every row PASS; INFO rows are for comparison with the pre-deploy backup.
-- Safe to run before the migration: it then reports FAIL instead of erroring.
with
exp_cols(tbl, col, typ) as (values
  ('profiles','id','uuid'),('profiles','display_name','text'),('profiles','rating','integer'),
  ('profiles','wins','integer'),('profiles','losses','integer'),('profiles','character_id','integer'),
  ('profiles','is_bot','boolean'),('profiles','ghost_samples','integer[]'),
  ('profiles','alias_changed_at','timestamp with time zone'),
  ('device_identities','device_key_hash','text'),('device_identities','device_key','text'),
  ('device_identities','profile_id','uuid'),
  ('pvp_matches','id','uuid'),('pvp_matches','player_id','uuid'),('pvp_matches','opponent_id','uuid'),
  ('pvp_matches','opponent_is_bot','boolean'),('pvp_matches','opponent_samples','integer[]'),
  ('pvp_matches','status','text'),('pvp_matches','player_rounds','integer[]'),
  ('pvp_matches','result','text'),('pvp_matches','rating_before','integer'),
  ('pvp_matches','rating_after','integer'),('pvp_matches','rating_delta','integer'),
  ('pvp_matches','expires_at','timestamp with time zone'),('pvp_matches','completed_at','timestamp with time zone'),
  ('daily_challenges','sample_ms','integer[]'),('daily_completions','player_rounds','integer[]'),
  ('friend_challenges','sample_ms','integer[]'),('friend_challenge_attempts','player_rounds','integer[]'),
  ('analytics_app_events','props','jsonb'),
  -- Ghost V2
  ('profiles','ghost_snapshot','jsonb'),('profiles','ghost_replay_snapshot','jsonb'),
  ('pvp_matches','ghost_version','smallint'),('pvp_matches','opponent_snapshot','jsonb'),
  ('pvp_matches','player_round_detail','jsonb')
),
client_rpc(sig) as (values
  ('pvp_issue_device_key()'),
  ('pvp_login_device(p_device_key text)'),
  ('pvp_reroll_display_name(p_device_key text)'),
  ('pvp_update_profile(p_device_key text, p_character_id integer, p_cosmetic_npc_id integer, p_clear_cosmetic boolean)'),
  ('pvp_matchmake(p_device_key text)'),
  ('pvp_matchmake_v2(p_device_key text)'),
  ('pvp_submit_match_v2(p_device_key text, p_match_id uuid, p_rounds jsonb, p_character_id integer)'),
  ('pvp_submit_match(p_device_key text, p_opponent_id uuid, p_opponent_is_bot boolean, p_player_rounds integer[], p_opponent_rounds integer[], p_score_player integer, p_score_opponent integer, p_result text, p_character_id integer, p_cosmetic_npc_id integer)'),
  ('pvp_forfeit_match(p_device_key text, p_match_id uuid)'),
  ('pvp_leaderboard(p_device_key text, limit_count integer)'),
  ('pvp_history(p_device_key text, limit_count integer)'),
  ('pvp_capabilities()'),
  ('pvp_get_daily(p_device_key text)'),
  ('pvp_submit_daily(p_device_key text, p_player_rounds integer[], p_score_player integer, p_score_opponent integer, p_result text, p_shared boolean)'),
  ('pvp_mark_daily_shared(p_device_key text)'),
  ('pvp_create_friend_challenge(p_device_key text, p_sample_ms integer[], p_score_creator integer, p_creator_avg_ms integer, p_creator_best_ms integer, p_character_id integer, p_cosmetic_npc_id integer)'),
  ('pvp_get_friend_challenge(p_device_key text, p_code text)'),
  ('pvp_submit_friend_challenge(p_device_key text, p_code text, p_player_rounds integer[], p_score_player integer, p_score_creator integer, p_result text)'),
  ('analytics_record_event(p_device_key text, p_event_name text, p_app_version text, p_platform text, p_props jsonb)')
),
fn as (
  select p.oid, p.proname::text as name,
         p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as sig,
         p.prosecdef, p.proconfig, p.prosrc,
         has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
),
ranking_tables(t) as (values
  ('profiles'),('device_identities'),('pvp_matches'),('daily_challenges'),('daily_completions'),
  ('friend_challenges'),('friend_challenge_attempts'),('analytics_app_events'),
  ('analytics_match_events'),('app_settings'),
  -- donor-era objects on the remote; leaderboard is an auto-updatable view
  ('matches'),('ghost_loads'),('leaderboard')
),
checks as (
  -- tables
  select 'table' as chk, t.t::text as obj,
         case when to_regclass('public.' || t.t) is not null then 'PASS'
              when t.t in ('analytics_match_events','app_settings','matches','ghost_loads','leaderboard')
                then 'PASS' else 'FAIL' end as status,
         case when to_regclass('public.' || t.t) is null then 'missing' else '' end as detail
  from ranking_tables t

  -- columns / types
  union all
  select 'column', e.tbl || '.' || e.col,
         case when exists (
           select 1 from pg_attribute a join pg_class c on c.oid = a.attrelid
           where c.relnamespace = 'public'::regnamespace and c.relname = e.tbl
             and a.attname = e.col and not a.attisdropped
             and format_type(a.atttypid, a.atttypmod) = e.typ) then 'PASS' else 'FAIL' end,
         'expected ' || e.typ
  from exp_cols e

  -- human ghost policy
  union all
  select 'ghost', 'profiles.ghost_samples nullable, no synthetic default',
         case when exists (
           select 1 from pg_attribute a
           where a.attrelid = to_regclass('public.profiles') and a.attname = 'ghost_samples'
             and not a.attnotnull and not a.atthasdef) then 'PASS' else 'FAIL' end, ''
  union all
  select 'ghost', 'no placeholder ghosts without a completed ranked match',
         case when to_regclass('public.pvp_matches') is null then 'FAIL'
              else (xpath('/row/s/text()', query_to_xml(
                'select case when count(*) = 0 then ''PASS'' else ''FAIL'' end as s
                 from public.profiles p
                 where p.ghost_samples = array[520,500,540]
                   and not exists (select 1 from public.pvp_matches m
                                   where m.player_id = p.id and m.status = ''complete'')',
                false, true, '')))[1]::text end, ''

  -- device identity
  union all
  select 'device', 'primary key is device_key_hash',
         case when exists (
           select 1 from pg_constraint c
           where c.conrelid = to_regclass('public.device_identities') and c.contype = 'p'
             and c.conkey = array[(select attnum from pg_attribute
                                   where attrelid = to_regclass('public.device_identities')
                                     and attname = 'device_key_hash')]) then 'PASS' else 'FAIL' end, ''
  union all
  select 'device', 'every row hashed; plaintext rows match sha256',
         case when to_regprocedure('public.pvp_device_hash(text)') is null then 'FAIL'
              else (xpath('/row/s/text()', query_to_xml(
                'select case when count(*) = 0 then ''PASS'' else ''FAIL'' end as s
                 from public.device_identities
                 where device_key_hash is null
                    or (device_key is not null and device_key_hash <> public.pvp_device_hash(device_key))',
                false, true, '')))[1]::text end, ''

  -- client RPC signatures + EXECUTE
  union all
  select 'rpc', r.sig,
         case when exists (select 1 from fn where fn.sig = r.sig and fn.anon_exec and fn.auth_exec)
              then 'PASS' else 'FAIL' end,
         coalesce((select 'anon=' || fn.anon_exec || ' secdef=' || fn.prosecdef
                   from fn where fn.sig = r.sig), 'missing or signature differs')
  from client_rpc r

  -- SECURITY DEFINER must pin search_path
  union all
  select 'secdef', fn.sig,
         case when exists (select 1 from unnest(coalesce(fn.proconfig, '{}')) c where c like 'search_path=%')
              then 'PASS' else 'FAIL' end,
         coalesce(array_to_string(fn.proconfig, ';'), 'no search_path')
  from fn where fn.prosecdef and fn.sig in (select sig from client_rpc)

  -- anything else client-executable
  union all
  select 'exposed', fn.sig,
         case when fn.name like 'pvp%' or fn.name like 'analytics%' or fn.name like 'admin%'
                   or fn.name like 'rating%' or fn.name like '\_friend%'
              then 'FAIL' else 'WARN' end,
         'anon/authenticated can EXECUTE a function outside the V3 allowlist'
  from fn
  where (fn.anon_exec or fn.auth_exec) and fn.sig not in (select sig from client_rpc)

  -- direct table access
  union all
  select 'table_grant', t.t::text,
         case when to_regclass('public.' || t.t) is null then 'PASS'
              when has_table_privilege('anon', to_regclass('public.' || t.t), 'SELECT,INSERT,UPDATE,DELETE')
                or has_table_privilege('authenticated', to_regclass('public.' || t.t), 'SELECT,INSERT,UPDATE,DELETE')
              then 'FAIL' else 'PASS' end,
         'anon/authenticated direct access'
  from ranking_tables t

  -- RLS
  union all
  select 'rls', c.relname::text, case when c.relrowsecurity then 'PASS' else 'FAIL' end, ''
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
    and c.relname in ('profiles','device_identities','pvp_matches','daily_challenges','daily_completions',
                      'friend_challenges','friend_challenge_attempts','analytics_app_events')

  -- server behaviour
  union all
  select 'capability', 'pvp_capabilities().ranked_submit_idempotent',
         case when to_regprocedure('public.pvp_capabilities()') is null then 'FAIL'
              else (xpath('/row/s/text()', query_to_xml(
                'select case when (public.pvp_capabilities()->>''ranked_submit_idempotent'')::boolean
                             then ''PASS'' else ''FAIL'' end as s', false, true, '')))[1]::text end,
         ''
  union all
  select 'behaviour', 'pvp_submit_match locks a server match (idempotent)',
         case when exists (select 1 from fn where fn.name = 'pvp_submit_match'
                             and position('pvp_lock_match' in fn.prosrc) > 0
                             and position('match_not_found_or_expired' in fn.prosrc) > 0)
              then 'PASS' else 'FAIL' end, ''
  union all
  select 'behaviour', 'legacy profile-id path is ambiguity-safe',
         case when exists (select 1 from fn where fn.name = 'pvp_lock_match'
                             and position('legacy_match_ambiguous' in fn.prosrc) > 0)
              then 'PASS' else 'FAIL' end, ''


  -- Ghost V2: validators behave (pure functions, evaluated read-only)
  union all
  select 'ghost_v2', v.label,
         case when to_regprocedure('public.pvp_ghost_snapshot_is_valid(jsonb)') is null then 'FAIL'
              else (xpath('/row/s/text()', query_to_xml(format(
                'select case when public.pvp_ghost_snapshot_is_valid(%L::jsonb) = %s then ''PASS'' else ''FAIL'' end as s',
                v.snap, v.expect), false, true, '')))[1]::text end,
         'expect ' || v.expect
  from (values
    ('2-round snapshot valid', '{"version":2,"source_match_id":"00000000-0000-0000-0000-000000000000","recorded_at":"x","rounds":[{"outcome":"shot","reaction_ms":241},{"outcome":"shot","reaction_ms":268}]}', 'true'),
    ('3-round snapshot valid', '{"version":2,"source_match_id":"00000000-0000-0000-0000-000000000000","recorded_at":"x","rounds":[{"outcome":"shot","reaction_ms":241},{"outcome":"early","reaction_ms":null},{"outcome":"timeout","reaction_ms":null}]}', 'true'),
    ('1-round snapshot rejected', '{"version":2,"source_match_id":"00000000-0000-0000-0000-000000000000","recorded_at":"x","rounds":[{"outcome":"shot","reaction_ms":241}]}', 'false'),
    ('4-round snapshot rejected', '{"version":2,"source_match_id":"00000000-0000-0000-0000-000000000000","recorded_at":"x","rounds":[{"outcome":"shot","reaction_ms":241},{"outcome":"shot","reaction_ms":241},{"outcome":"shot","reaction_ms":241},{"outcome":"shot","reaction_ms":241}]}', 'false'),
    ('shot 79 ms rejected', '{"version":2,"source_match_id":"00000000-0000-0000-0000-000000000000","recorded_at":"x","rounds":[{"outcome":"shot","reaction_ms":79},{"outcome":"shot","reaction_ms":268}]}', 'false'),
    ('shot 2500 ms rejected', '{"version":2,"source_match_id":"00000000-0000-0000-0000-000000000000","recorded_at":"x","rounds":[{"outcome":"shot","reaction_ms":2500},{"outcome":"shot","reaction_ms":268}]}', 'false'),
    ('unknown outcome rejected', '{"version":2,"source_match_id":"00000000-0000-0000-0000-000000000000","recorded_at":"x","rounds":[{"outcome":"bang","reaction_ms":null},{"outcome":"shot","reaction_ms":268}]}', 'false'),
    ('invalid 79 ms (audit value) valid', '{"version":2,"source_match_id":"00000000-0000-0000-0000-000000000000","recorded_at":"x","rounds":[{"outcome":"invalid","reaction_ms":79},{"outcome":"shot","reaction_ms":268}]}', 'true'),
    ('invalid 2500 ms (audit value) valid', '{"version":2,"source_match_id":"00000000-0000-0000-0000-000000000000","recorded_at":"x","rounds":[{"outcome":"invalid","reaction_ms":2500},{"outcome":"shot","reaction_ms":268}]}', 'true'),
    ('invalid inside 80..2499 rejected', '{"version":2,"source_match_id":"00000000-0000-0000-0000-000000000000","recorded_at":"x","rounds":[{"outcome":"invalid","reaction_ms":243},{"outcome":"shot","reaction_ms":268}]}', 'false'),
    ('invalid without value rejected', '{"version":2,"source_match_id":"00000000-0000-0000-0000-000000000000","recorded_at":"x","rounds":[{"outcome":"invalid","reaction_ms":null},{"outcome":"shot","reaction_ms":268}]}', 'false'),
    ('early with value rejected', '{"version":2,"source_match_id":"00000000-0000-0000-0000-000000000000","recorded_at":"x","rounds":[{"outcome":"early","reaction_ms":50},{"outcome":"shot","reaction_ms":268}]}', 'false')
  ) as v(label, snap, expect)

  -- Ghost V2: constraints present
  union all
  select 'ghost_v2', 'constraint ' || c.name,
         case when exists (select 1 from pg_constraint where conname = c.name) then 'PASS' else 'FAIL' end, ''
  from (values ('profile_ghost_snapshot_valid'), ('profile_ghost_snapshot_human_only'),
               ('profile_ghost_replay_snapshot_valid'), ('match_opponent_snapshot_valid'),
               ('match_opponent_snapshot_human_only'), ('match_player_round_detail_valid'),
               ('match_ghost_version_valid')) as c(name)

  -- Ghost V2: data invariants
  union all
  select 'ghost_v2', 'no bot holds a ghost snapshot',
         case when to_regclass('public.profiles') is null
                or not exists (select 1 from pg_attribute where attrelid = to_regclass('public.profiles') and attname = 'ghost_replay_snapshot')
              then 'FAIL'
              else (xpath('/row/s/text()', query_to_xml(
                'select case when count(*) = 0 then ''PASS'' else ''FAIL'' end as s from public.profiles
                 where is_bot and (ghost_snapshot is not null or ghost_replay_snapshot is not null)',
                false, true, '')))[1]::text end, ''
  union all
  select 'ghost_v2', 'replay snapshots are 3-round',
         case when not exists (select 1 from pg_attribute where attrelid = to_regclass('public.profiles') and attname = 'ghost_replay_snapshot')
              then 'FAIL'
              else (xpath('/row/s/text()', query_to_xml(
                'select case when count(*) = 0 then ''PASS'' else ''FAIL'' end as s from public.profiles
                 where ghost_replay_snapshot is not null and jsonb_array_length(ghost_replay_snapshot->''rounds'') <> 3',
                false, true, '')))[1]::text end, ''

  -- Ghost V2: capability + contract
  union all
  select 'capability', k.key,
         case when to_regprocedure('public.pvp_capabilities()') is null then 'FAIL'
              else (xpath('/row/s/text()', query_to_xml(format(
                'select case when public.pvp_capabilities()->>%L = %L then ''PASS'' else ''FAIL'' end as s', k.key, k.val),
                false, true, '')))[1]::text end,
         'expect ' || k.val
  from (values ('ghost_snapshot_v2', 'true'), ('history_rounds', 'true'),
               ('ghost_contract', 'ghost-v2-final-20260928'), ('contract', 'v3-baseline-20260927'),
               ('ranked_submit_idempotent', 'true')) as k(key, val)

  -- Ghost V2: server behaviour markers (legacy compatibility)
  union all
  select 'behaviour', 'V1 submit refuses non-SHOT snapshot matches',
         case when exists (select 1 from fn where fn.name = 'pvp_submit_match'
                             and position('match_requires_ghost_v2_client' in fn.prosrc) > 0)
              then 'PASS' else 'FAIL' end, ''
  union all
  select 'behaviour', 'matchmaking replays only 3-round snapshots',
         case when exists (select 1 from fn where fn.name = 'pvp_assign_match'
                             and position('ghost_replay_snapshot' in fn.prosrc) > 0)
              then 'PASS' else 'FAIL' end, ''
  union all
  select 'capability', 'ghost_outcomes includes invalid',
         case when to_regprocedure('public.pvp_capabilities()') is null then 'FAIL'
              else (xpath('/row/s/text()', query_to_xml(
                'select case when public.pvp_capabilities()->''ghost_outcomes'' ? ''invalid''
                             and public.pvp_capabilities()->''reaction_valid_ms'' = ''[80, 2499]''::jsonb
                        then ''PASS'' else ''FAIL'' end as s', false, true, '')))[1]::text end, ''
  union all
  select 'behaviour', 'scoring: player INVALID loses, ghost INVALID is a foul',
         case when to_regprocedure('public.pvp_score_rounds_v2(jsonb,jsonb)') is null then 'FAIL'
              else (xpath('/row/s/text()', query_to_xml(
                'select case when
                   (select so from public.pvp_score_rounds_v2(
                      ''[{"outcome":"invalid","reaction_ms":60},{"outcome":"shot","reaction_ms":500},{"outcome":"shot","reaction_ms":500}]''::jsonb,
                      ''[{"outcome":"shot","reaction_ms":2499},{"outcome":"shot","reaction_ms":500},{"outcome":"shot","reaction_ms":500}]''::jsonb)) = 1
                   and (select sp from public.pvp_score_rounds_v2(
                      ''[{"outcome":"timeout","reaction_ms":null},{"outcome":"shot","reaction_ms":500},{"outcome":"shot","reaction_ms":500}]''::jsonb,
                      ''[{"outcome":"invalid","reaction_ms":60},{"outcome":"shot","reaction_ms":500},{"outcome":"shot","reaction_ms":500}]''::jsonb)) = 1
                 then ''PASS'' else ''FAIL'' end as s', false, true, '')))[1]::text end, ''
  union all
  select 'behaviour', 'reaction range 80..2499 in ' || f.name,
         case when exists (select 1 from fn where fn.name = f.name
                             and position('2499' in fn.prosrc) > 0
                             and position('and 2500' in fn.prosrc) = 0 and position('> 2500' in fn.prosrc) = 0)
              then 'PASS' else 'FAIL' end, 'no 2500 upper bound left'
  from (values ('pvp_finalize_match'), ('pvp_submit_daily'), ('pvp_submit_friend_challenge'),
               ('pvp_create_friend_challenge')) as f(name)
  union all
  select 'behaviour', 'V2 submit validates rounds',
         case when exists (select 1 from fn where fn.name = 'pvp_submit_match_v2'
                             and position('invalid_rounds' in fn.prosrc) > 0)
              then 'PASS' else 'FAIL' end, ''

  -- fingerprints to compare with the pre-deploy backup (must be identical)
  union all
  select 'fingerprint', 'profiles', 'INFO',
         'rows=' || count(*) || ' md5=' || coalesce(md5(string_agg(
           id::text || '|' || display_name || '|' || rating || '|' || wins || '|' || losses,
           ',' order by id)), '-')
  from public.profiles
  union all
  select 'fingerprint', 'device_identities', 'INFO', 'rows=' || count(*)
  from public.device_identities
)
select status, chk, obj, detail
from checks
order by case status when 'FAIL' then 0 when 'WARN' then 1 when 'INFO' then 3 else 2 end, chk, obj;
