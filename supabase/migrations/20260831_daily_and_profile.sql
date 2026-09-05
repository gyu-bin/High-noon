-- Daily challenge + profile cosmetic update
-- Apply via Supabase MCP apply_migration or SQL editor

create or replace function public.pvp_update_profile(
  p_device_key text,
  p_character_id integer default null,
  p_cosmetic_npc_id integer default null,
  p_clear_cosmetic boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
$$;

grant execute on function public.pvp_update_profile(text, integer, integer, boolean) to anon, authenticated;

create table if not exists public.daily_challenges (
  challenge_date date primary key,
  opponent_name text not null,
  sample_ms integer[3] not null,
  character_id integer not null default 1,
  cosmetic_npc_id integer null,
  created_at timestamptz not null default now(),
  constraint daily_sample_len check (array_length(sample_ms, 1) = 3)
);

create table if not exists public.daily_completions (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  challenge_date date not null references public.daily_challenges(challenge_date) on delete cascade,
  score_player integer not null,
  score_opponent integer not null,
  result text not null check (result in ('win', 'loss', 'draw')),
  player_rounds integer[3],
  avg_ms integer null,
  shared boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (profile_id, challenge_date)
);

alter table public.daily_challenges enable row level security;
alter table public.daily_completions enable row level security;

create or replace function public.pvp_get_daily(p_device_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me jsonb;
  pid uuid;
  d date := (timezone('utc', now()))::date;
  ch public.daily_challenges;
  done public.daily_completions;
  s1 int; s2 int; s3 int;
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

  return jsonb_build_object(
    'challenge_date', ch.challenge_date,
    'opponent_name', ch.opponent_name,
    'sample_ms', to_jsonb(ch.sample_ms),
    'character_id', ch.character_id,
    'cosmetic_npc_id', ch.cosmetic_npc_id,
    'completed', done is not null,
    'completion', case when done is null then null else jsonb_build_object(
      'score_player', done.score_player,
      'score_opponent', done.score_opponent,
      'result', done.result,
      'avg_ms', done.avg_ms,
      'shared', done.shared
    ) end
  );
end;
$$;

grant execute on function public.pvp_get_daily(text) to anon, authenticated;

create or replace function public.pvp_submit_daily(
  p_device_key text,
  p_player_rounds integer[],
  p_score_player integer,
  p_score_opponent integer,
  p_result text,
  p_shared boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
$$;

grant execute on function public.pvp_submit_daily(text, integer[], integer, integer, text, boolean) to anon, authenticated;

create or replace function public.pvp_mark_daily_shared(p_device_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me jsonb;
  pid uuid;
  d date := (timezone('utc', now()))::date;
begin
  me := public.pvp_login_device(p_device_key);
  pid := (me->>'id')::uuid;
  update public.daily_completions
  set shared = true
  where profile_id = pid and challenge_date = d;
  if not found then
    raise exception 'daily not completed';
  end if;
  return jsonb_build_object('ok', true, 'badge', 'daily_duelist');
end;
$$;

grant execute on function public.pvp_mark_daily_shared(text) to anon, authenticated;

insert into public.daily_challenges (challenge_date, opponent_name, sample_ms, character_id)
values (
  (timezone('utc', now()))::date,
  'Daily Outlaw #' || to_char((timezone('utc', now()))::date, 'MMDD'),
  array[248, 217, 261],
  2
)
on conflict (challenge_date) do nothing;
