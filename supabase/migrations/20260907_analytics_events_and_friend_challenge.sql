-- Analytics app events + friend challenge (async 1:1 ghost duel)

create table if not exists public.analytics_app_events (
  id bigint generated always as identity primary key,
  device_key_hash text not null,
  event_name text not null,
  app_version text,
  platform text,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_app_events_created_at_idx
  on public.analytics_app_events (created_at desc);

create index if not exists analytics_app_events_name_idx
  on public.analytics_app_events (event_name, created_at desc);

alter table public.analytics_app_events enable row level security;

create or replace function public.analytics_record_event(
  p_device_key text,
  p_event_name text,
  p_app_version text default null,
  p_platform text default null,
  p_props jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
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
$$;

revoke execute on function public.analytics_record_event(text, text, text, text, jsonb)
  from public;
grant execute on function public.analytics_record_event(text, text, text, text, jsonb)
  to anon, authenticated;

-- Friend challenges ---------------------------------------------------------

create table if not exists public.friend_challenges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  creator_name text not null,
  sample_ms integer[3] not null,
  character_id integer not null default 1,
  cosmetic_npc_id integer null,
  creator_avg_ms integer null,
  creator_best_ms integer null,
  score_creator integer not null default 0,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  constraint friend_sample_len check (array_length(sample_ms, 1) = 3),
  constraint friend_code_format check (code ~ '^[A-Z0-9]{6}$')
);

create table if not exists public.friend_challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.friend_challenges(id) on delete cascade,
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  challenger_name text not null,
  player_rounds integer[3],
  score_player integer not null,
  score_creator integer not null,
  result text not null check (result in ('win', 'loss', 'draw')),
  avg_ms integer null,
  best_ms integer null,
  created_at timestamptz not null default now(),
  unique (challenge_id, challenger_id)
);

create index if not exists friend_challenges_code_idx on public.friend_challenges (code);
create index if not exists friend_challenges_creator_idx on public.friend_challenges (creator_id);

alter table public.friend_challenges enable row level security;
alter table public.friend_challenge_attempts enable row level security;

create or replace function public._friend_challenge_code()
returns text
language plpgsql
as $$
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
$$;

revoke execute on function public._friend_challenge_code() from public;

create or replace function public.pvp_create_friend_challenge(
  p_device_key text,
  p_sample_ms integer[],
  p_score_creator integer default 0,
  p_creator_avg_ms integer default null,
  p_creator_best_ms integer default null,
  p_character_id integer default 1,
  p_cosmetic_npc_id integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
$$;

revoke execute on function public.pvp_create_friend_challenge(
  text, integer[], integer, integer, integer, integer, integer
) from public;
grant execute on function public.pvp_create_friend_challenge(
  text, integer[], integer, integer, integer, integer, integer
) to anon, authenticated;

create or replace function public.pvp_get_friend_challenge(
  p_device_key text,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
$$;

revoke execute on function public.pvp_get_friend_challenge(text, text) from public;
grant execute on function public.pvp_get_friend_challenge(text, text) to anon, authenticated;

create or replace function public.pvp_submit_friend_challenge(
  p_device_key text,
  p_code text,
  p_player_rounds integer[],
  p_score_player integer,
  p_score_creator integer,
  p_result text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
  score_p int := 0;
  score_c int := 0;
  actual_result text;
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
      if ms is null or ms < 80 or ms > 2500 then
        score_c := score_c + 1;
      elsif ms < row.sample_ms[i] then
        score_p := score_p + 1;
      elsif ms > row.sample_ms[i] then
        score_c := score_c + 1;
      end if;
      exit when score_p >= 2 or score_c >= 2;
    end loop;
  end if;
  avg_v := case when valid > 0 then round(sum_ms::numeric / valid)::int else null end;
  actual_result := case when score_p > score_c then 'win' when score_c > score_p then 'loss' else 'draw' end;

  insert into public.friend_challenge_attempts (
    challenge_id, challenger_id, challenger_name, player_rounds,
    score_player, score_creator, result, avg_ms, best_ms
  ) values (
    row.id, pid, coalesce(me->>'display_name', 'Challenger'), p_player_rounds,
    score_p, score_c, actual_result, avg_v, best_v
  );

  return jsonb_build_object(
    'already_completed', false,
    'code', row.code,
    'result', actual_result,
    'score_player', score_p,
    'score_creator', score_c,
    'avg_ms', avg_v,
    'best_ms', best_v,
    'creator_name', row.creator_name,
    'creator_avg_ms', row.creator_avg_ms,
    'creator_best_ms', row.creator_best_ms
  );
end;
$$;

revoke execute on function public.pvp_submit_friend_challenge(
  text, text, integer[], integer, integer, text
) from public;
grant execute on function public.pvp_submit_friend_challenge(
  text, text, integer[], integer, integer, text
) to anon, authenticated;

revoke all on table public.analytics_app_events, public.friend_challenges,
  public.friend_challenge_attempts from anon, authenticated;
