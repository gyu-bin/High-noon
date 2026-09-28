-- Fixture: reconstruction of the REAL remote project nyevnntgcyvlileeugal as of
-- 2026-09-27, generated from supabase/ops/backups/20260927_pre_deploy_backup.*.json
-- (captured read-only through the Supabase MCP connector before any change).
-- Function bodies are verbatim from the remote. TEST FIXTURE ONLY.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
-- Supabase auth schema stub (the remote has auth triggers; auth.users is empty there)
create schema if not exists auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
set search_path = public, extensions;

create table public.analytics_app_events (
  app_version text,
  created_at timestamp with time zone not null default now(),
  device_key_hash text not null,
  event_name text not null,
  id bigint generated always as identity,
  platform text,
  props jsonb not null default '{}'::jsonb
);
create table public.analytics_match_events (
  app_version text,
  avg_reaction_ms numeric,
  created_at timestamp with time zone not null default now(),
  device_key_hash text not null,
  highest_unlocked integer not null,
  id bigint generated always as identity,
  npc_id integer not null,
  npc_wins integer not null,
  platform text,
  player_wins integer not null,
  won boolean not null
);
create table public.app_settings (
  key text not null,
  value text not null
);
create table public.daily_challenges (
  challenge_date date not null,
  character_id integer not null default 1,
  cosmetic_npc_id integer,
  created_at timestamp with time zone not null default now(),
  opponent_name text not null,
  sample_ms integer[] not null
);
create table public.daily_completions (
  avg_ms integer,
  challenge_date date not null,
  created_at timestamp with time zone not null default now(),
  player_rounds integer[],
  profile_id uuid not null,
  result text not null,
  score_opponent integer not null,
  score_player integer not null,
  shared boolean not null default false
);
create table public.device_identities (
  created_at timestamp with time zone not null default now(),
  device_key text not null,
  profile_id uuid not null
);
create table public.friend_challenge_attempts (
  avg_ms integer,
  best_ms integer,
  challenge_id uuid not null,
  challenger_id uuid not null,
  challenger_name text not null,
  created_at timestamp with time zone not null default now(),
  id uuid not null default gen_random_uuid(),
  player_rounds integer[],
  result text not null,
  score_creator integer not null,
  score_player integer not null
);
create table public.friend_challenges (
  character_id integer not null default 1,
  code text not null,
  cosmetic_npc_id integer,
  created_at timestamp with time zone not null default now(),
  creator_avg_ms integer,
  creator_best_ms integer,
  creator_id uuid not null,
  creator_name text not null,
  expires_at timestamp with time zone not null default (now() + '14 days'::interval),
  id uuid not null default gen_random_uuid(),
  sample_ms integer[] not null,
  score_creator integer not null default 0
);
create table public.ghost_loads (
  character_id integer not null default 1,
  cosmetic_npc_id integer,
  rating_at_submit integer not null default 1000,
  sample_ms integer[] not null,
  updated_at timestamp with time zone not null default now(),
  user_id uuid not null
);
create table public.matches (
  created_at timestamp with time zone not null default now(),
  id uuid not null default gen_random_uuid(),
  opponent_id uuid not null,
  opponent_is_bot boolean not null default false,
  opponent_rounds integer[] not null,
  player_id uuid not null,
  player_rounds integer[],
  rating_after integer not null,
  rating_before integer not null,
  rating_delta integer not null,
  result text not null,
  score_opponent integer not null default 0,
  score_player integer not null default 0
);
create table public.profiles (
  character_id integer not null default 1,
  cosmetic_npc_id integer,
  created_at timestamp with time zone not null default now(),
  display_name text not null,
  id uuid not null,
  is_bot boolean not null default false,
  losses integer not null default 0,
  rank_tier text not null default 'silver'::text,
  rating integer not null default 1000,
  updated_at timestamp with time zone not null default now(),
  wins integer not null default 0
);
alter table public.analytics_app_events add constraint analytics_app_events_pkey PRIMARY KEY (id);
alter table public.analytics_match_events add constraint analytics_match_events_pkey PRIMARY KEY (id);
alter table public.app_settings add constraint app_settings_pkey PRIMARY KEY (key);
alter table public.daily_challenges add constraint daily_challenges_pkey PRIMARY KEY (challenge_date);
alter table public.daily_completions add constraint daily_completions_pkey PRIMARY KEY (profile_id, challenge_date);
alter table public.device_identities add constraint device_identities_pkey PRIMARY KEY (device_key);
alter table public.friend_challenge_attempts add constraint friend_challenge_attempts_pkey PRIMARY KEY (id);
alter table public.friend_challenges add constraint friend_challenges_pkey PRIMARY KEY (id);
alter table public.ghost_loads add constraint ghost_loads_pkey PRIMARY KEY (user_id);
alter table public.matches add constraint matches_pkey PRIMARY KEY (id);
alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table public.friend_challenge_attempts add constraint friend_challenge_attempts_challenge_id_challenger_id_key UNIQUE (challenge_id, challenger_id);
alter table public.friend_challenges add constraint friend_challenges_code_key UNIQUE (code);
alter table public.daily_challenges add constraint daily_sample_len CHECK ((array_length(sample_ms, 1) = 3));
alter table public.daily_completions add constraint daily_completions_result_check CHECK ((result = ANY (ARRAY['win'::text, 'loss'::text, 'draw'::text])));
alter table public.device_identities add constraint device_identities_device_key_check CHECK ((char_length(device_key) >= 32));
alter table public.friend_challenge_attempts add constraint friend_challenge_attempts_result_check CHECK ((result = ANY (ARRAY['win'::text, 'loss'::text, 'draw'::text])));
alter table public.friend_challenges add constraint friend_code_format CHECK ((code ~ '^[A-Z0-9]{6}$'::text));
alter table public.friend_challenges add constraint friend_sample_len CHECK ((array_length(sample_ms, 1) = 3));
alter table public.ghost_loads add constraint ghost_loads_character_id_check CHECK (((character_id >= 1) AND (character_id <= 4)));
alter table public.ghost_loads add constraint ghost_loads_sample_len CHECK ((array_length(sample_ms, 1) = 3));
alter table public.ghost_loads add constraint ghost_loads_sample_range CHECK ((((sample_ms[1] >= 80) AND (sample_ms[1] <= 2500)) AND ((sample_ms[2] >= 80) AND (sample_ms[2] <= 2500)) AND ((sample_ms[3] >= 80) AND (sample_ms[3] <= 2500))));
alter table public.matches add constraint matches_result_check CHECK ((result = ANY (ARRAY['win'::text, 'loss'::text, 'draw'::text])));
alter table public.profiles add constraint profiles_character_id_check CHECK (((character_id >= 1) AND (character_id <= 4)));
alter table public.profiles add constraint profiles_losses_check CHECK ((losses >= 0));
alter table public.profiles add constraint profiles_rating_check CHECK ((rating >= 0));
alter table public.profiles add constraint profiles_wins_check CHECK ((wins >= 0));
alter table public.daily_completions add constraint daily_completions_challenge_date_fkey FOREIGN KEY (challenge_date) REFERENCES daily_challenges(challenge_date) ON DELETE CASCADE;
alter table public.daily_completions add constraint daily_completions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.device_identities add constraint device_identities_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.friend_challenge_attempts add constraint friend_challenge_attempts_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES friend_challenges(id) ON DELETE CASCADE;
alter table public.friend_challenge_attempts add constraint friend_challenge_attempts_challenger_id_fkey FOREIGN KEY (challenger_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.friend_challenges add constraint friend_challenges_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.ghost_loads add constraint ghost_loads_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.matches add constraint matches_opponent_id_fkey FOREIGN KEY (opponent_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.matches add constraint matches_player_id_fkey FOREIGN KEY (player_id) REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX analytics_app_events_created_at_idx ON public.analytics_app_events USING btree (created_at DESC);
CREATE INDEX analytics_app_events_name_idx ON public.analytics_app_events USING btree (event_name, created_at DESC);
CREATE INDEX analytics_match_events_created_at_idx ON public.analytics_match_events USING btree (created_at DESC);
CREATE INDEX analytics_match_events_npc_id_idx ON public.analytics_match_events USING btree (npc_id);
CREATE UNIQUE INDEX device_identities_profile_idx ON public.device_identities USING btree (profile_id);
CREATE INDEX friend_challenges_code_idx ON public.friend_challenges USING btree (code);
CREATE INDEX friend_challenges_creator_idx ON public.friend_challenges USING btree (creator_id);
CREATE INDEX ghost_loads_rating_idx ON public.ghost_loads USING btree (rating_at_submit);
CREATE INDEX matches_player_created_idx ON public.matches USING btree (player_id, created_at DESC);
CREATE INDEX profiles_bots_rating_idx ON public.profiles USING btree (rating) WHERE (is_bot = true);
CREATE UNIQUE INDEX profiles_display_name_uidx ON public.profiles USING btree (display_name);
CREATE INDEX profiles_rating_idx ON public.profiles USING btree (rating DESC) WHERE (is_bot = false);
CREATE OR REPLACE FUNCTION public._friend_challenge_code()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
begin
  for i in 1..6 loop
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return out;
end;
$function$;
CREATE OR REPLACE FUNCTION public.admin_get_overview(p_pin text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  expected_pin text;
begin
  select value into expected_pin
  from public.app_settings
  where key = 'admin_pin'
  limit 1;

  if expected_pin is null or p_pin is distinct from expected_pin then
    raise exception 'invalid_pin' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total_matches', (select count(*)::int from public.analytics_match_events),
    'unique_devices', (select count(distinct device_key_hash)::int from public.analytics_match_events),
    'median_reaction_ms', (
      select percentile_cont(0.5) within group (order by avg_reaction_ms)
      from public.analytics_match_events
      where avg_reaction_ms is not null
    ),
    'avg_highest_unlocked', (
      select round(avg(highest_unlocked)::numeric, 1)
      from public.analytics_match_events
    ),
    'cleared_npc_avg', (
      select round(avg(cleared)::numeric, 1)
      from (
        select count(*) filter (where won) / greatest(count(*), 1)::numeric as cleared
        from public.analytics_match_events
        group by npc_id
      ) sub
    ),
    'last_7d_matches', (
      select count(*)::int
      from public.analytics_match_events
      where created_at >= now() - interval '7 days'
    ),
    'progress_funnel', coalesce((
      select jsonb_agg(
        jsonb_build_object('npc_id', npc_id, 'wins', wins, 'matches', matches)
        order by npc_id
      )
      from (
        select
          npc_id,
          count(*) filter (where won)::int as wins,
          count(*)::int as matches
        from public.analytics_match_events
        group by npc_id
      ) funnel
    ), '[]'::jsonb)
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.analytics_record_event(p_device_key text, p_event_name text, p_app_version text DEFAULT NULL::text, p_platform text DEFAULT NULL::text, p_props jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if p_device_key is null or length(p_device_key) < 16 then
    return;
  end if;
  if p_event_name is null or length(trim(p_event_name)) < 2 then
    return;
  end if;

  insert into public.analytics_app_events (
    device_key_hash,
    event_name,
    app_version,
    platform,
    props
  ) values (
    encode(digest(p_device_key, 'sha256'), 'hex'),
    lower(trim(p_event_name)),
    nullif(trim(coalesce(p_app_version, '')), ''),
    nullif(trim(coalesce(p_platform, '')), ''),
    coalesce(p_props, '{}'::jsonb)
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.analytics_record_match(p_device_key text, p_app_version text, p_platform text, p_npc_id integer, p_won boolean, p_player_wins integer, p_npc_wins integer, p_avg_reaction_ms numeric, p_highest_unlocked integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if p_device_key is null or length(p_device_key) < 16 then
    return;
  end if;

  insert into public.analytics_match_events (
    device_key_hash,
    app_version,
    platform,
    npc_id,
    won,
    player_wins,
    npc_wins,
    avg_reaction_ms,
    highest_unlocked
  ) values (
    encode(digest(p_device_key, 'sha256'), 'hex'),
    nullif(trim(p_app_version), ''),
    nullif(trim(p_platform), ''),
    p_npc_id,
    p_won,
    p_player_wins,
    p_npc_wins,
    p_avg_reaction_ms,
    greatest(1, p_highest_unlocked)
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.cleanup_profile_on_user_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  delete from public.profiles where id = old.id and is_bot = false;
  return old;
end;
$function$;
CREATE OR REPLACE FUNCTION public.elo_expected(r_a integer, r_b integer)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select 1.0 / (1.0 + power(10.0, (r_b - r_a)::numeric / 400.0));
$function$;
CREATE OR REPLACE FUNCTION public.ensure_my_profile()
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  p public.profiles;
  adjectives text[] := array['Dusty','Rusty','Silent','Quick','Lone','Wild','Iron','Pale','Cunning','Scarred'];
  nouns text[] := array['Coyote','Vulture','Revolver','Outlaw','Sheriff','Bandit','Rider','Hawk','Snake','Drifter'];
  name text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into p from public.profiles where id = uid;
  if found then
    return p;
  end if;

  name := adjectives[1 + floor(random() * array_length(adjectives, 1))::int]
    || ' '
    || nouns[1 + floor(random() * array_length(nouns, 1))::int]
    || ' #'
    || lpad((floor(random() * 900) + 100)::text, 3, '0');

  insert into public.profiles (id, display_name, rank_tier)
  values (uid, name, public.rating_to_rank_tier(1000))
  returning * into p;

  return p;
end;
$function$;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  adjectives text[] := array['Dusty','Rusty','Silent','Quick','Lone','Wild','Iron','Pale','Cunning','Scarred'];
  nouns text[] := array['Coyote','Vulture','Revolver','Outlaw','Sheriff','Bandit','Rider','Hawk','Snake','Drifter'];
  name text;
begin
  name := adjectives[1 + floor(random() * array_length(adjectives, 1))::int]
    || ' '
    || nouns[1 + floor(random() * array_length(nouns, 1))::int]
    || ' #'
    || lpad((floor(random() * 900) + 100)::text, 3, '0');

  insert into public.profiles (id, display_name, rank_tier)
  values (new.id, name, public.rating_to_rank_tier(1000))
  on conflict (id) do nothing;

  return new;
end;
$function$;
CREATE OR REPLACE FUNCTION public.pvp_create_friend_challenge(p_device_key text, p_sample_ms integer[], p_score_creator integer DEFAULT 0, p_creator_avg_ms integer DEFAULT NULL::integer, p_creator_best_ms integer DEFAULT NULL::integer, p_character_id integer DEFAULT 1, p_cosmetic_npc_id integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me jsonb;
  pid uuid;
  code text;
  tries int := 0;
  row public.friend_challenges;
  s1 int; s2 int; s3 int;
begin
  me := public.pvp_login_device(p_device_key);
  pid := (me->>'id')::uuid;

  if p_sample_ms is null or array_length(p_sample_ms, 1) is distinct from 3 then
    raise exception 'invalid_sample_ms';
  end if;

  s1 := greatest(80, least(2500, coalesce(p_sample_ms[1], 280)));
  s2 := greatest(80, least(2500, coalesce(p_sample_ms[2], 280)));
  s3 := greatest(80, least(2500, coalesce(p_sample_ms[3], 280)));

  loop
    tries := tries + 1;
    code := public._friend_challenge_code();
    begin
      insert into public.friend_challenges (
        code, creator_id, creator_name, sample_ms, character_id, cosmetic_npc_id,
        creator_avg_ms, creator_best_ms, score_creator
      ) values (
        code, pid, coalesce(me->>'display_name', 'Outlaw'),
        array[s1, s2, s3],
        greatest(1, least(4, coalesce(p_character_id, 1))),
        p_cosmetic_npc_id,
        p_creator_avg_ms,
        p_creator_best_ms,
        greatest(0, coalesce(p_score_creator, 0))
      )
      returning * into row;
      exit;
    exception when unique_violation then
      if tries >= 8 then
        raise;
      end if;
    end;
  end loop;

  return jsonb_build_object(
    'id', row.id,
    'code', row.code,
    'creator_name', row.creator_name,
    'sample_ms', to_jsonb(row.sample_ms),
    'character_id', row.character_id,
    'cosmetic_npc_id', row.cosmetic_npc_id,
    'creator_avg_ms', row.creator_avg_ms,
    'creator_best_ms', row.creator_best_ms,
    'score_creator', row.score_creator,
    'expires_at', row.expires_at
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.pvp_get_daily(p_device_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me jsonb;
  pid uuid;
  d date := (timezone('utc', now()))::date;
  ch public.daily_challenges;
  done public.daily_completions;
  s1 int; s2 int; s3 int;
  has_done boolean := false;
begin
  me := public.pvp_login_device(p_device_key);
  pid := (me->>'id')::uuid;

  select * into ch from public.daily_challenges where challenge_date = d;
  if not found then
    s1 := 200 + floor(random() * 120)::int;
    s2 := 200 + floor(random() * 120)::int;
    s3 := 200 + floor(random() * 120)::int;
    insert into public.daily_challenges (challenge_date, opponent_name, sample_ms, character_id)
    values (
      d,
      'Daily Outlaw #' || to_char(d, 'MMDD'),
      array[s1, s2, s3],
      1 + floor(random() * 4)::int
    )
    returning * into ch;
  end if;

  select * into done from public.daily_completions
  where profile_id = pid and challenge_date = d;
  has_done := found;

  return jsonb_build_object(
    'challenge_date', ch.challenge_date,
    'opponent_name', ch.opponent_name,
    'sample_ms', to_jsonb(ch.sample_ms),
    'character_id', ch.character_id,
    'cosmetic_npc_id', ch.cosmetic_npc_id,
    'completed', has_done,
    'completion', case when not has_done then null else jsonb_build_object(
      'score_player', done.score_player,
      'score_opponent', done.score_opponent,
      'result', done.result,
      'avg_ms', done.avg_ms,
      'shared', done.shared
    ) end
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.pvp_get_friend_challenge(p_device_key text, p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me jsonb;
  pid uuid;
  row public.friend_challenges;
  attempt public.friend_challenge_attempts;
  normalized text;
  has_attempt boolean := false;
begin
  me := public.pvp_login_device(p_device_key);
  pid := (me->>'id')::uuid;
  normalized := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));

  if length(normalized) <> 6 then
    raise exception 'invalid_code';
  end if;

  select * into row from public.friend_challenges where code = normalized;
  if not found then
    raise exception 'challenge_not_found';
  end if;

  if row.expires_at < now() then
    raise exception 'challenge_expired';
  end if;

  select * into attempt
  from public.friend_challenge_attempts
  where challenge_id = row.id and challenger_id = pid;
  has_attempt := found;

  return jsonb_build_object(
    'id', row.id,
    'code', row.code,
    'creator_id', row.creator_id,
    'creator_name', row.creator_name,
    'sample_ms', to_jsonb(row.sample_ms),
    'character_id', row.character_id,
    'cosmetic_npc_id', row.cosmetic_npc_id,
    'creator_avg_ms', row.creator_avg_ms,
    'creator_best_ms', row.creator_best_ms,
    'score_creator', row.score_creator,
    'expires_at', row.expires_at,
    'is_creator', row.creator_id = pid,
    'completed', has_attempt,
    'completion', case when not has_attempt then null else jsonb_build_object(
      'score_player', attempt.score_player,
      'score_creator', attempt.score_creator,
      'result', attempt.result,
      'avg_ms', attempt.avg_ms,
      'best_ms', attempt.best_ms
    ) end
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.pvp_leaderboard(p_device_key text, limit_count integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me jsonb;
  me_id uuid;
  me_rating int;
  me_wins int;
  rows jsonb;
  my_rank int;
begin
  me := public.pvp_login_device(p_device_key);
  me_id := (me->>'id')::uuid;
  me_rating := (me->>'rating')::int;
  me_wins := (me->>'wins')::int;

  select coalesce(jsonb_agg(row_data order by ord), '[]'::jsonb) into rows
  from (
    select
      jsonb_build_object(
        'id', p.id,
        'display_name', p.display_name,
        'character_id', p.character_id,
        'cosmetic_npc_id', p.cosmetic_npc_id,
        'rating', p.rating,
        'rank_tier', p.rank_tier,
        'wins', p.wins,
        'losses', p.losses,
        'rank', row_number() over (order by p.rating desc, p.wins desc, p.id asc)
      ) as row_data,
      row_number() over (order by p.rating desc, p.wins desc, p.id asc) as ord
    from public.profiles p
    where p.is_bot = false
    order by p.rating desc, p.wins desc, p.id asc
    limit greatest(1, least(limit_count, 100))
  ) s;

  select count(*)::int + 1 into my_rank
  from public.profiles p
  where p.is_bot = false
    and (
      p.rating > me_rating
      or (p.rating = me_rating and p.wins > me_wins)
      or (p.rating = me_rating and p.wins = me_wins and p.id < me_id)
    );

  return jsonb_build_object(
    'entries', rows,
    'me', me || jsonb_build_object('rank', my_rank)
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.pvp_login_device(p_device_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  pid uuid;
  p public.profiles;
  name text;
begin
  if p_device_key is null or char_length(p_device_key) < 32 then
    raise exception 'invalid device key';
  end if;

  select profile_id into pid from public.device_identities where device_key = p_device_key;
  if pid is null then
    pid := gen_random_uuid();
    name := public.pvp_pick_western_alias(pid, null);

    insert into public.profiles (id, display_name, rank_tier, is_bot)
    values (pid, name, public.rating_to_rank_tier(1000), false);

    insert into public.device_identities (device_key, profile_id)
    values (p_device_key, pid);
  end if;

  select * into p from public.profiles where id = pid;
  return jsonb_build_object(
    'id', p.id,
    'display_name', p.display_name,
    'character_id', p.character_id,
    'cosmetic_npc_id', p.cosmetic_npc_id,
    'rating', p.rating,
    'rank_tier', p.rank_tier,
    'wins', p.wins,
    'losses', p.losses
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.pvp_mark_daily_shared(p_device_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me jsonb;
  pid uuid;
  d date := (timezone('utc', now()))::date;
  updated int;
begin
  me := public.pvp_login_device(p_device_key);
  pid := (me->>'id')::uuid;
  update public.daily_completions
  set shared = true
  where profile_id = pid and challenge_date = d;
  get diagnostics updated = row_count;
  if updated = 0 then
    raise exception 'daily not completed';
  end if;
  return jsonb_build_object('ok', true, 'badge', 'daily_duelist');
end;
$function$;
CREATE OR REPLACE FUNCTION public.pvp_matchmake(p_device_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me jsonb;
  me_id uuid;
  me_rating int;
  opp public.profiles;
  ghost public.ghost_loads;
  rating_window int := 250;
begin
  me := public.pvp_login_device(p_device_key);
  me_id := (me->>'id')::uuid;
  me_rating := (me->>'rating')::int;

  select p.* into opp
  from public.profiles p
  join public.ghost_loads g on g.user_id = p.id
  where p.id <> me_id
    and p.is_bot = false
    and abs(p.rating - me_rating) <= rating_window
  order by random()
  limit 1;

  if opp.id is null then
    select p.* into opp
    from public.profiles p
    join public.ghost_loads g on g.user_id = p.id
    where p.id <> me_id and p.is_bot = false
    order by abs(p.rating - me_rating), random()
    limit 1;
  end if;

  if opp.id is null then
    select p.* into opp
    from public.profiles p
    join public.ghost_loads g on g.user_id = p.id
    where p.is_bot = true
    order by abs(p.rating - me_rating), random()
    limit 1;
  end if;

  if opp.id is null then
    raise exception 'no opponents available';
  end if;

  select * into ghost from public.ghost_loads where user_id = opp.id;

  return jsonb_build_object(
    'player', me,
    'opponent', jsonb_build_object(
      'id', opp.id,
      'display_name', opp.display_name,
      'character_id', coalesce(ghost.character_id, opp.character_id),
      'cosmetic_npc_id', coalesce(ghost.cosmetic_npc_id, opp.cosmetic_npc_id),
      'rating', opp.rating,
      'rank_tier', opp.rank_tier,
      'is_bot', opp.is_bot,
      'sample_ms', to_jsonb(ghost.sample_ms)
    )
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.pvp_pick_western_alias(p_exclude_profile_id uuid DEFAULT NULL::uuid, p_not_equal text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  epithets text[] := array[
    'Dust', 'Rust', 'Pale', 'Noon', 'Iron', 'Red', 'Dry', 'Cold',
    'Wild', 'Black', 'Grim', 'Silent', 'Crooked', 'Hollow', 'Burnt',
    'Lucky', 'Blind', 'Mean', 'Bone', 'Ash', 'Copper', 'Broken',
    'Lonely', 'Quick', 'Last', 'Ragged', 'Salty', 'Scarred', 'Cinder',
    'Steel', 'Brass', 'Tin', 'Lead', 'Stone', 'Sand', 'Clay', 'Mud',
    'Smoke', 'Ember', 'Frost', 'Storm', 'Thunder', 'Dark', 'White',
    'Grey', 'Gold', 'Silver', 'Bitter', 'Tough', 'Lean', 'Fast',
    'Dead', 'Lost', 'Worn', 'Faded', 'Blunt', 'Sharp', 'Bent',
    'Lonesome', 'Restless', 'Reckless', 'Ruthless', 'Fearless',
    'Lawless', 'Nameless', 'Faceless', 'Trail', 'Wagon', 'River',
    'Desert', 'Prairie', 'Mesa', 'Ridge', 'Arroyo', 'Sierra',
    'Amber', 'Ivory', 'Onyx', 'Rusty', 'Dusty', 'Sunny', 'Moonlit',
    'Gilded', 'Jagged', 'Rugged', 'Weathered', 'Sunburnt', 'Windworn'
  ];
  nouns text[] := array[
    'Crow', 'Fox', 'Kid', 'Spur', 'Ghost', 'Draw', 'Shot', 'Hat',
    'Gulch', 'Drifter', 'Outlaw', 'Snake', 'Wolf', 'Vulture', 'Widow',
    'Bullet', 'Canyon', 'Duster', 'Graves', 'Bandit', 'Ranger', 'Hawk',
    'Coyote', 'Colt', 'Mesa', 'Holster', 'Deputy', 'Skull', 'Cactus',
    'Hickory', 'Raven', 'Buzzard', 'Jackal', 'Mustang', 'Bronco',
    'Steer', 'Bull', 'Ram', 'Elk', 'Bear', 'Owl', 'Wren', 'Magpie',
    'Rook', 'Pony', 'Saddle', 'Lasso', 'Whip', 'Knife', 'Rifle',
    'Flint', 'Hammer', 'Anvil', 'Barrel', 'Keg', 'Coin', 'Nugget',
    'Creek', 'Fork', 'Bend', 'Bluff', 'Pass', 'Mine', 'Claim',
    'Saloon', 'Jail', 'Gallows', 'Noose', 'Rope', 'Badge', 'Star',
    'Marshal', 'Judge', 'Preacher', 'Smith', 'Tanner', 'Miner',
    'Wrangler', 'Stirrup', 'Cartridge', 'Powder', 'Dollar', 'Wagon',
    'Trail', 'Coach', 'Track', 'Ridge', 'Peak', 'Shaft'
  ];
  givens text[] := array[
    'Cal', 'Jed', 'Wes', 'Cole', 'Hank', 'Gus', 'Levi', 'Asa',
    'Kit', 'Reed', 'Clay', 'Beau', 'Wade', 'Finn', 'Roy', 'Slim',
    'Buck', 'Tex', 'Cash', 'Holt', 'Jess', 'Sam', 'Ned', 'Ike',
    'Abe', 'Clem', 'Otis', 'Earl', 'Chet', 'Burt', 'Mack', 'Dale',
    'Vern', 'Hoyt', 'Quinn', 'Shane', 'Luke', 'Zeke', 'Nate', 'Seth',
    'Gabe', 'Will', 'Joel', 'Ross', 'Drew', 'Lane', 'Grant', 'Clark'
  ];
  surnames text[] := array[
    'Boone', 'Kane', 'Flint', 'Graves', 'Ryder', 'Colton', 'Nash',
    'Brooks', 'Hayes', 'McGraw', 'Dalton', 'Cassidy', 'Pike', 'Crowe',
    'Wolfe', 'Stark', 'Frost', 'Stone', 'Marsh', 'Cross', 'Drake',
    'Flynn', 'Gage', 'Hart', 'Knox', 'Lane', 'Moss', 'Shaw', 'Tate',
    'Voss', 'Webb', 'York', 'Blake', 'Cobb', 'Dunn', 'Ford', 'Hale',
    'Lang', 'Pratt', 'Sloan', 'Vance', 'West', 'Quinn', 'True',
    'Holt', 'Reed', 'Clay', 'Buck', 'Colt', 'Spur'
  ];
  prefixes text[] := array['Old', 'Mad', 'Lil', 'Big', 'Poor', 'Saint'];
  romans text[] := array[
    'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'
  ];
  reserved text[] := array[
    'Pale Rider', 'Iron Sheriff', 'The Undertaker',
    'Nameless Gunslinger', 'Crimson Rosa', 'Phantom Sharpshooter'
  ];
  candidate text;
  base text;
  i int;
  roll int;
  roman text;
begin
  for i in 1..96 loop
    roll := floor(random() * 4)::int;
    if roll = 0 then
      candidate := epithets[1 + floor(random() * array_length(epithets, 1))::int]
        || ' '
        || nouns[1 + floor(random() * array_length(nouns, 1))::int];
    elsif roll = 1 then
      candidate := givens[1 + floor(random() * array_length(givens, 1))::int]
        || ' '
        || surnames[1 + floor(random() * array_length(surnames, 1))::int];
    elsif roll = 2 then
      candidate := epithets[1 + floor(random() * array_length(epithets, 1))::int]
        || ' '
        || surnames[1 + floor(random() * array_length(surnames, 1))::int];
    else
      candidate := prefixes[1 + floor(random() * array_length(prefixes, 1))::int]
        || ' '
        || nouns[1 + floor(random() * array_length(nouns, 1))::int];
    end if;

    if candidate = p_not_equal then
      continue;
    end if;
    if candidate = any (reserved) then
      continue;
    end if;
    if char_length(candidate) > 22 then
      continue;
    end if;
    if not exists (
      select 1
      from public.profiles
      where display_name = candidate
        and (p_exclude_profile_id is null or id is distinct from p_exclude_profile_id)
    ) then
      return candidate;
    end if;
  end loop;

  base := epithets[1 + floor(random() * array_length(epithets, 1))::int]
    || ' '
    || nouns[1 + floor(random() * array_length(nouns, 1))::int];
  foreach roman in array romans loop
    candidate := base || ' ' || roman;
    if candidate is distinct from p_not_equal
      and not exists (
        select 1
        from public.profiles
        where display_name = candidate
          and (p_exclude_profile_id is null or id is distinct from p_exclude_profile_id)
      )
    then
      return candidate;
    end if;
  end loop;

  return base || ' ' || lpad((floor(random() * 90) + 10)::int::text, 2, '0');
end;
$function$;
CREATE OR REPLACE FUNCTION public.pvp_reroll_display_name(p_device_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  pid uuid;
  rec public.profiles%rowtype;
  next_name text;
begin
  if p_device_key is null or char_length(p_device_key) < 32 then
    raise exception 'invalid_device_key';
  end if;

  select profile_id into pid
  from public.device_identities
  where device_key = p_device_key;

  if pid is null then
    raise exception 'player_not_found';
  end if;

  select * into rec
  from public.profiles
  where id = pid
  for update;

  if not found then
    raise exception 'player_not_found';
  end if;

  next_name := public.pvp_pick_western_alias(pid, rec.display_name);

  update public.profiles
     set display_name = next_name
   where id = rec.id
   returning * into rec;

  return jsonb_build_object(
    'id', rec.id,
    'display_name', rec.display_name,
    'character_id', rec.character_id,
    'cosmetic_npc_id', rec.cosmetic_npc_id,
    'rating', rec.rating,
    'rank_tier', rec.rank_tier,
    'wins', rec.wins,
    'losses', rec.losses
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.pvp_set_cosmetic_npc(p_device_key text, p_cosmetic_npc_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  pid uuid;
  rec public.profiles%rowtype;
begin
  if p_device_key is null or char_length(p_device_key) < 32 then
    raise exception 'invalid_device_key';
  end if;

  if p_cosmetic_npc_id is not null
     and (p_cosmetic_npc_id < 1 or p_cosmetic_npc_id > 22) then
    raise exception 'invalid_cosmetic';
  end if;

  select profile_id into pid
  from public.device_identities
  where device_key = p_device_key;

  if pid is null then
    raise exception 'player_not_found';
  end if;

  update public.profiles
     set cosmetic_npc_id = p_cosmetic_npc_id
   where id = pid
   returning * into rec;

  return jsonb_build_object(
    'id', rec.id,
    'display_name', rec.display_name,
    'character_id', rec.character_id,
    'cosmetic_npc_id', rec.cosmetic_npc_id,
    'rating', rec.rating,
    'rank_tier', rec.rank_tier,
    'wins', rec.wins,
    'losses', rec.losses
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.pvp_submit_daily(p_device_key text, p_player_rounds integer[], p_score_player integer, p_score_opponent integer, p_result text, p_shared boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me jsonb;
  pid uuid;
  d date := (timezone('utc', now()))::date;
  ch public.daily_challenges;
  existing public.daily_completions;
  avg_v int;
  valid int := 0;
  sum_ms int := 0;
  i int;
  ms int;
begin
  me := public.pvp_login_device(p_device_key);
  pid := (me->>'id')::uuid;

  select * into ch from public.daily_challenges where challenge_date = d;
  if not found then
    raise exception 'no daily challenge';
  end if;

  if p_result not in ('win', 'loss', 'draw') then
    raise exception 'invalid result';
  end if;

  select * into existing from public.daily_completions
  where profile_id = pid and challenge_date = d;
  if found then
    if p_shared and not existing.shared then
      update public.daily_completions set shared = true
      where profile_id = pid and challenge_date = d;
      existing.shared := true;
    end if;
    return jsonb_build_object(
      'already_completed', true,
      'challenge_date', d,
      'result', existing.result,
      'score_player', existing.score_player,
      'score_opponent', existing.score_opponent,
      'avg_ms', existing.avg_ms,
      'shared', existing.shared,
      'badge', 'daily_duelist'
    );
  end if;

  if p_player_rounds is not null then
    for i in 1..least(coalesce(array_length(p_player_rounds, 1), 0), 3) loop
      ms := p_player_rounds[i];
      if ms is not null and ms between 80 and 2500 then
        sum_ms := sum_ms + ms;
        valid := valid + 1;
      end if;
    end loop;
  end if;
  avg_v := case when valid > 0 then round(sum_ms::numeric / valid)::int else null end;

  insert into public.daily_completions (
    profile_id, challenge_date, score_player, score_opponent,
    result, player_rounds, avg_ms, shared
  ) values (
    pid, d, p_score_player, p_score_opponent,
    p_result, p_player_rounds, avg_v, coalesce(p_shared, false)
  );

  return jsonb_build_object(
    'already_completed', false,
    'challenge_date', d,
    'result', p_result,
    'score_player', p_score_player,
    'score_opponent', p_score_opponent,
    'avg_ms', avg_v,
    'shared', coalesce(p_shared, false),
    'badge', 'daily_duelist'
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.pvp_submit_friend_challenge(p_device_key text, p_code text, p_player_rounds integer[], p_score_player integer, p_score_creator integer, p_result text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me jsonb;
  pid uuid;
  row public.friend_challenges;
  existing public.friend_challenge_attempts;
  normalized text;
  avg_v int;
  best_v int;
  valid int := 0;
  sum_ms int := 0;
  i int;
  ms int;
begin
  me := public.pvp_login_device(p_device_key);
  pid := (me->>'id')::uuid;
  normalized := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));

  if length(normalized) <> 6 then
    raise exception 'invalid_code';
  end if;
  if p_result not in ('win', 'loss', 'draw') then
    raise exception 'invalid_result';
  end if;

  select * into row from public.friend_challenges where code = normalized;
  if not found then
    raise exception 'challenge_not_found';
  end if;
  if row.expires_at < now() then
    raise exception 'challenge_expired';
  end if;
  if row.creator_id = pid then
    raise exception 'cannot_challenge_self';
  end if;

  select * into existing
  from public.friend_challenge_attempts
  where challenge_id = row.id and challenger_id = pid;
  if found then
    return jsonb_build_object(
      'already_completed', true,
      'code', row.code,
      'result', existing.result,
      'score_player', existing.score_player,
      'score_creator', existing.score_creator,
      'avg_ms', existing.avg_ms,
      'best_ms', existing.best_ms,
      'creator_name', row.creator_name,
      'creator_avg_ms', row.creator_avg_ms,
      'creator_best_ms', row.creator_best_ms
    );
  end if;

  best_v := null;
  if p_player_rounds is not null then
    for i in 1..least(coalesce(array_length(p_player_rounds, 1), 0), 3) loop
      ms := p_player_rounds[i];
      if ms is not null and ms between 80 and 2500 then
        sum_ms := sum_ms + ms;
        valid := valid + 1;
        if best_v is null or ms < best_v then
          best_v := ms;
        end if;
      end if;
    end loop;
  end if;
  avg_v := case when valid > 0 then round(sum_ms::numeric / valid)::int else null end;

  insert into public.friend_challenge_attempts (
    challenge_id, challenger_id, challenger_name, player_rounds,
    score_player, score_creator, result, avg_ms, best_ms
  ) values (
    row.id, pid, coalesce(me->>'display_name', 'Challenger'), p_player_rounds,
    p_score_player, p_score_creator, p_result, avg_v, best_v
  );

  return jsonb_build_object(
    'already_completed', false,
    'code', row.code,
    'result', p_result,
    'score_player', p_score_player,
    'score_creator', p_score_creator,
    'avg_ms', avg_v,
    'best_ms', best_v,
    'creator_name', row.creator_name,
    'creator_avg_ms', row.creator_avg_ms,
    'creator_best_ms', row.creator_best_ms
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.pvp_submit_match(p_device_key text, p_opponent_id uuid, p_opponent_is_bot boolean, p_player_rounds integer[], p_opponent_rounds integer[], p_score_player integer, p_score_opponent integer, p_result text, p_character_id integer DEFAULT 1, p_cosmetic_npc_id integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me jsonb;
  me_row public.profiles;
  opp public.profiles;
  k numeric := 24;
  expected numeric;
  score numeric;
  new_rating int;
  delta int;
  match_id uuid;
  valid_samples int[] := array[]::int[];
  ms int;
  i int;
  rating_before int;
begin
  me := public.pvp_login_device(p_device_key);
  select * into me_row from public.profiles where id = (me->>'id')::uuid;
  rating_before := me_row.rating;

  if p_result not in ('win', 'loss', 'draw') then
    raise exception 'invalid result';
  end if;

  if array_length(p_opponent_rounds, 1) is distinct from 3 then
    raise exception 'opponent_rounds must have length 3';
  end if;

  if p_player_rounds is not null then
    for i in 1..least(coalesce(array_length(p_player_rounds, 1), 0), 3) loop
      ms := p_player_rounds[i];
      if ms is not null and (ms < 80 or ms > 2500) then
        raise exception 'invalid player reaction ms: %', ms;
      end if;
      if ms is not null and ms between 80 and 2500 then
        valid_samples := array_append(valid_samples, ms);
      end if;
    end loop;
  end if;

  select * into opp from public.profiles where id = p_opponent_id;
  if not found then
    raise exception 'opponent not found';
  end if;

  expected := public.elo_expected(me_row.rating, opp.rating);
  score := case p_result when 'win' then 1.0 when 'draw' then 0.5 else 0.0 end;
  delta := round(k * (score - expected))::int;
  new_rating := greatest(0, me_row.rating + delta);

  insert into public.matches (
    player_id, opponent_id, opponent_is_bot,
    player_rounds, opponent_rounds,
    score_player, score_opponent, result,
    rating_before, rating_after, rating_delta
  ) values (
    me_row.id, p_opponent_id, p_opponent_is_bot,
    p_player_rounds, p_opponent_rounds,
    p_score_player, p_score_opponent, p_result,
    rating_before, new_rating, delta
  ) returning id into match_id;

  update public.profiles set
    rating = new_rating,
    rank_tier = public.rating_to_rank_tier(new_rating),
    wins = wins + case when p_result = 'win' then 1 else 0 end,
    losses = losses + case when p_result = 'loss' then 1 else 0 end,
    character_id = greatest(1, least(4, coalesce(p_character_id, character_id))),
    cosmetic_npc_id = p_cosmetic_npc_id
  where id = me_row.id;

  if array_length(valid_samples, 1) is not null and array_length(valid_samples, 1) > 0 then
    while array_length(valid_samples, 1) < 3 loop
      valid_samples := array_append(valid_samples, valid_samples[array_length(valid_samples, 1)]);
    end loop;
    valid_samples := valid_samples[1:3];

    insert into public.ghost_loads (user_id, sample_ms, character_id, cosmetic_npc_id, rating_at_submit)
    values (me_row.id, valid_samples, coalesce(p_character_id, me_row.character_id), p_cosmetic_npc_id, new_rating)
    on conflict (user_id) do update set
      sample_ms = excluded.sample_ms,
      character_id = excluded.character_id,
      cosmetic_npc_id = excluded.cosmetic_npc_id,
      rating_at_submit = excluded.rating_at_submit,
      updated_at = now();
  end if;

  select * into me_row from public.profiles where id = me_row.id;

  return jsonb_build_object(
    'match_id', match_id,
    'rating_before', rating_before,
    'rating_after', me_row.rating,
    'rating_delta', delta,
    'rank_tier', me_row.rank_tier,
    'wins', me_row.wins,
    'losses', me_row.losses
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.pvp_update_profile(p_device_key text, p_character_id integer DEFAULT NULL::integer, p_cosmetic_npc_id integer DEFAULT NULL::integer, p_clear_cosmetic boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me jsonb;
  pid uuid;
begin
  me := public.pvp_login_device(p_device_key);
  pid := (me->>'id')::uuid;

  update public.profiles set
    character_id = case
      when p_character_id is not null then greatest(1, least(4, p_character_id))
      else character_id
    end,
    cosmetic_npc_id = case
      when p_clear_cosmetic then null
      when p_cosmetic_npc_id is not null then p_cosmetic_npc_id
      else cosmetic_npc_id
    end
  where id = pid;

  return public.pvp_login_device(p_device_key);
end;
$function$;
CREATE OR REPLACE FUNCTION public.rating_to_rank_tier(r integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case
    when r < 1000 then 'bronze'
    when r < 1200 then 'silver'
    when r < 1400 then 'gold'
    when r < 1600 then 'platinum'
    else 'diamond'
  end;
$function$;
CREATE OR REPLACE FUNCTION public.seed_ranking_bots()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  tiers text[] := array['bronze','silver','gold','platinum','diamond'];
  ranges int[][] := array[
    array[400,600,900],
    array[280,400,1100],
    array[220,280,1300],
    array[180,220,1500],
    array[120,180,1700]
  ];
  names text[] := array[
    'Wandering Gun','Dust Phantom','Canyon Echo','Midnight Spur','Iron Whisper',
    'Saloon Ghost','Broken Spur','Pale Trigger','Crosswind','Last Smoke'
  ];
  t int;
  i int;
  bot_id uuid;
  rmin int;
  rmax int;
  rating_val int;
  s1 int;
  s2 int;
  s3 int;
  nm text;
  name_idx int;
begin
  -- idempotent: clear previous bots
  delete from public.ghost_loads gl using public.profiles p where gl.user_id = p.id and p.is_bot;
  delete from public.matches m using public.profiles p where (m.player_id = p.id or m.opponent_id = p.id) and p.is_bot;
  delete from public.profiles where is_bot = true;

  for t in 1..5 loop
    rmin := ranges[t][1];
    rmax := ranges[t][2];
    rating_val := ranges[t][3];
    for i in 1..4 loop
      bot_id := gen_random_uuid();
      name_idx := ((t - 1) * 2 + ((i - 1) % 2)) + 1;
      nm := names[name_idx] || ' #' || lpad(((t - 1) * 4 + i)::text, 2, '0');

      insert into public.profiles (id, display_name, character_id, rating, rank_tier, wins, losses, is_bot)
      values (
        bot_id,
        nm,
        1 + ((i - 1) % 4),
        rating_val + (i * 7),
        tiers[t],
        5 + i,
        3 + (i % 3),
        true
      );

      s1 := rmin + floor(random() * (rmax - rmin + 1))::int;
      s2 := rmin + floor(random() * (rmax - rmin + 1))::int;
      s3 := rmin + floor(random() * (rmax - rmin + 1))::int;

      insert into public.ghost_loads (user_id, sample_ms, character_id, rating_at_submit)
      values (bot_id, array[s1, s2, s3], 1 + ((i - 1) % 4), rating_val + (i * 7));
    end loop;
  end loop;
end;
$function$;
CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;
create view public.leaderboard as
 SELECT id, display_name, character_id, cosmetic_npc_id, rating, rank_tier, wins, losses, updated_at
   FROM profiles
  WHERE is_bot = false
  ORDER BY rating DESC, wins DESC;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
create trigger on_auth_user_deleted after delete on auth.users for each row execute function cleanup_profile_on_user_delete();
create trigger profiles_touch before update on public.profiles for each row execute function touch_updated_at();
create trigger ghost_touch before update on public.ghost_loads for each row execute function touch_updated_at();
alter table public.analytics_app_events enable row level security;
alter table public.analytics_match_events enable row level security;
alter table public.app_settings enable row level security;
alter table public.daily_challenges enable row level security;
alter table public.daily_completions enable row level security;
alter table public.device_identities enable row level security;
alter table public.friend_challenge_attempts enable row level security;
alter table public.friend_challenges enable row level security;
alter table public.ghost_loads enable row level security;
alter table public.matches enable row level security;
alter table public.profiles enable row level security;
create policy ghost_select on public.ghost_loads as permissive for select to authenticated using (true);
create policy ghost_update_self on public.ghost_loads as permissive for update to authenticated using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy ghost_upsert_self on public.ghost_loads as permissive for insert to authenticated with check ((auth.uid() = user_id));
create policy matches_select_own on public.matches as permissive for select to authenticated using ((auth.uid() = player_id));
create policy profiles_insert_self on public.profiles as permissive for insert to authenticated with check (((auth.uid() = id) AND (is_bot = false)));
create policy profiles_select on public.profiles as permissive for select to authenticated using (true);
create policy profiles_update_self on public.profiles as permissive for update to authenticated using (((auth.uid() = id) AND (is_bot = false))) with check (((auth.uid() = id) AND (is_bot = false) AND (rating = ( SELECT p.rating
   FROM profiles p
  WHERE (p.id = auth.uid()))) AND (wins = ( SELECT p.wins
   FROM profiles p
  WHERE (p.id = auth.uid()))) AND (losses = ( SELECT p.losses
   FROM profiles p
  WHERE (p.id = auth.uid())))));
revoke all on function public.pvp_pick_western_alias(uuid, text) from public;
revoke all on function public.pvp_pick_western_alias(uuid, text) from anon, authenticated;
revoke all on function public.pvp_reroll_display_name(text) from public;
revoke all on function public.pvp_set_cosmetic_npc(text, integer) from public;

-- ---- remote-like data: 20 seeded bots, humans with device keys, real ghost
-- records, legacy matches, a friend challenge (values are synthetic test data)
select public.seed_ranking_bots();
insert into public.app_settings (key, value) values ('admin_pin', 'fixture-not-a-real-pin');

