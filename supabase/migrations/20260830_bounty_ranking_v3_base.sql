-- HIGH NOON Bounty Ranking V3 baseline
-- Reconstructs the base objects missing from feat/async-ranking.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null unique,
  character_id integer not null default 1 check (character_id between 1 and 4),
  cosmetic_npc_id integer null,
  rating integer not null default 1000,
  rank_tier text not null default 'silver'
    check (rank_tier in ('bronze','silver','gold','platinum','diamond')),
  wins integer not null default 0,
  losses integer not null default 0,
  is_bot boolean not null default false,
  ghost_samples integer[3] not null default array[520,500,540],
  alias_changed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_ghost_samples_len check (array_length(ghost_samples, 1) = 3)
);

create table if not exists public.device_identities (
  device_key_hash text primary key,
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.pvp_matches (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid null references public.profiles(id) on delete set null,
  opponent_name text not null,
  opponent_character_id integer not null check (opponent_character_id between 1 and 4),
  opponent_rating integer not null,
  opponent_rank_tier text not null,
  opponent_is_bot boolean not null default false,
  opponent_samples integer[3] not null,
  status text not null default 'assigned' check (status in ('assigned','complete')),
  player_rounds integer[3],
  score_player integer,
  score_opponent integer,
  result text check (result is null or result in ('win','loss','draw')),
  rating_before integer,
  rating_after integer,
  rating_delta integer,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  completed_at timestamptz null,
  constraint match_samples_len check (array_length(opponent_samples, 1) = 3)
);

create index if not exists pvp_matches_player_created_idx
  on public.pvp_matches (player_id, created_at desc);
create index if not exists profiles_rating_idx
  on public.profiles (rating desc, wins desc);

alter table public.profiles enable row level security;
alter table public.device_identities enable row level security;
alter table public.pvp_matches enable row level security;

create or replace function public.rating_to_rank_tier(p_rating integer)
returns text language sql immutable as $$
  select case
    when p_rating < 1000 then 'bronze'
    when p_rating < 1200 then 'silver'
    when p_rating < 1400 then 'gold'
    when p_rating < 1600 then 'platinum'
    else 'diamond'
  end
$$;

create or replace function public.pvp_device_hash(p_device_key text)
returns text language plpgsql immutable
set search_path = public, extensions as $$
begin
  if p_device_key is null or char_length(p_device_key) < 32 then
    raise exception 'invalid_device_key';
  end if;
  return encode(digest(p_device_key, 'sha256'), 'hex');
end;
$$;

create or replace function public.pvp_new_alias()
returns text language plpgsql set search_path = public as $$
declare
  lefts text[] := array['Dust','Iron','Red','Silent','Quick','Wild','Ash','Copper','Lone','Black','Noon','Ragged'];
  rights text[] := array['Drifter','Crow','Fox','Rider','Spur','Colt','Hawk','Coyote','Marshal','Graves','Shot','Wolf'];
  candidate text;
  i integer;
begin
  for i in 1..64 loop
    candidate := lefts[1 + floor(random() * array_length(lefts,1))::int]
      || ' ' || rights[1 + floor(random() * array_length(rights,1))::int];
    if not exists (select 1 from public.profiles where display_name = candidate) then
      return candidate;
    end if;
  end loop;
  return 'Drifter ' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
end;
$$;

create or replace function public.pvp_login_device(p_device_key text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  key_hash text := public.pvp_device_hash(p_device_key);
  pid uuid;
  rec public.profiles;
begin
  select profile_id into pid from public.device_identities where device_key_hash = key_hash;
  if pid is null then
    insert into public.profiles(display_name, rank_tier)
    values (public.pvp_new_alias(), public.rating_to_rank_tier(1000))
    returning id into pid;
    insert into public.device_identities(device_key_hash, profile_id) values (key_hash, pid);
  end if;
  select * into rec from public.profiles where id = pid;
  return jsonb_build_object(
    'id', rec.id, 'display_name', rec.display_name,
    'character_id', rec.character_id, 'cosmetic_npc_id', null,
    'rating', rec.rating, 'rank_tier', rec.rank_tier,
    'wins', rec.wins, 'losses', rec.losses
  );
end;
$$;

create or replace function public.pvp_reroll_display_name(p_device_key text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  pid uuid;
  rec public.profiles;
begin
  select profile_id into pid from public.device_identities
  where device_key_hash = public.pvp_device_hash(p_device_key);
  if pid is null then raise exception 'player_not_found'; end if;
  select * into rec from public.profiles where id = pid for update;
  if rec.alias_changed_at is not null
     and rec.alias_changed_at > now() - interval '10 seconds' then
    raise exception 'alias_cooldown';
  end if;
  update public.profiles
  set display_name = public.pvp_new_alias(), alias_changed_at = now(), updated_at = now()
  where id = pid returning * into rec;
  return jsonb_build_object(
    'id', rec.id, 'display_name', rec.display_name,
    'character_id', rec.character_id, 'cosmetic_npc_id', null,
    'rating', rec.rating, 'rank_tier', rec.rank_tier,
    'wins', rec.wins, 'losses', rec.losses
  );
end;
$$;

create or replace function public.pvp_update_profile(
  p_device_key text,
  p_character_id integer default null,
  p_cosmetic_npc_id integer default null,
  p_clear_cosmetic boolean default false
)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare pid uuid;
begin
  perform public.pvp_login_device(p_device_key);
  select profile_id into pid from public.device_identities
  where device_key_hash = public.pvp_device_hash(p_device_key);
  if p_character_id is not null then
    update public.profiles set character_id = greatest(1, least(4, p_character_id)), updated_at = now()
    where id = pid;
  end if;
  return public.pvp_login_device(p_device_key);
end;
$$;

create or replace function public.pvp_matchmake(p_device_key text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  me public.profiles;
  opp public.profiles;
  match_row public.pvp_matches;
  bot_samples integer[3];
begin
  perform public.pvp_login_device(p_device_key);
  select p.* into me from public.profiles p
  join public.device_identities d on d.profile_id = p.id
  where d.device_key_hash = public.pvp_device_hash(p_device_key);

  select * into opp from public.profiles
  where id <> me.id and is_bot = false and abs(rating - me.rating) <= 300
  order by abs(rating - me.rating), random() limit 1;

  if opp.id is null then
    bot_samples := array[
      greatest(120, least(650, 430 - (me.rating - 1000) / 4)),
      greatest(120, least(650, 470 - (me.rating - 1000) / 4)),
      greatest(120, least(650, 450 - (me.rating - 1000) / 4))
    ];
    insert into public.pvp_matches(
      player_id, opponent_name, opponent_character_id, opponent_rating,
      opponent_rank_tier, opponent_is_bot, opponent_samples
    ) values (
      me.id, 'Dust Drifter', 1 + floor(random()*4)::int, me.rating,
      public.rating_to_rank_tier(me.rating), true, bot_samples
    ) returning * into match_row;
  else
    insert into public.pvp_matches(
      player_id, opponent_id, opponent_name, opponent_character_id,
      opponent_rating, opponent_rank_tier, opponent_is_bot, opponent_samples
    ) values (
      me.id, opp.id, opp.display_name, opp.character_id,
      opp.rating, opp.rank_tier, false, opp.ghost_samples
    ) returning * into match_row;
  end if;

  return jsonb_build_object(
    'match_id', match_row.id,
    'player', public.pvp_login_device(p_device_key),
    'opponent', jsonb_build_object(
      'id', coalesce(match_row.opponent_id, match_row.id),
      'display_name', match_row.opponent_name,
      'character_id', match_row.opponent_character_id,
      'cosmetic_npc_id', null,
      'rating', match_row.opponent_rating,
      'rank_tier', match_row.opponent_rank_tier,
      'is_bot', match_row.opponent_is_bot,
      'sample_ms', to_jsonb(match_row.opponent_samples)
    )
  );
end;
$$;

create or replace function public.pvp_submit_match(
  p_device_key text,
  p_opponent_id uuid,
  p_opponent_is_bot boolean,
  p_player_rounds integer[],
  p_opponent_rounds integer[],
  p_score_player integer,
  p_score_opponent integer,
  p_result text,
  p_character_id integer,
  p_cosmetic_npc_id integer default null
)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  pid uuid;
  me public.profiles;
  m public.pvp_matches;
  i integer;
  mine integer;
  theirs integer;
  sp integer := 0;
  so integer := 0;
  actual_result text;
  expected numeric;
  delta integer;
  after_rating integer;
  normalized integer[3] := array[null,null,null];
begin
  perform public.pvp_login_device(p_device_key);
  select profile_id into pid from public.device_identities
  where device_key_hash = public.pvp_device_hash(p_device_key);

  select * into m from public.pvp_matches
  where id = p_opponent_id and player_id = pid
    and status = 'assigned' and expires_at > now()
  for update;
  if m.id is null then raise exception 'match_not_found_or_expired'; end if;

  for i in 1..least(3, coalesce(array_length(p_player_rounds,1),0)) loop
    mine := p_player_rounds[i];
    theirs := m.opponent_samples[i];
    normalized[i] := case when mine between 80 and 2500 then mine else null end;
    if normalized[i] is null then
      so := so + 1;
    elsif theirs is null or theirs < 80 or theirs > 2500 then
      sp := sp + 1;
    elsif normalized[i] < theirs then
      sp := sp + 1;
    elsif normalized[i] > theirs then
      so := so + 1;
    end if;
    exit when sp >= 2 or so >= 2;
  end loop;

  actual_result := case when sp > so then 'win' when so > sp then 'loss' else 'draw' end;
  select * into me from public.profiles where id = pid for update;
  expected := 1.0 / (1.0 + power(10.0, (m.opponent_rating - me.rating)::numeric / 400.0));
  delta := round(32 * ((case actual_result when 'win' then 1.0 when 'draw' then 0.5 else 0.0 end) - expected))::int;
  after_rating := greatest(0, me.rating + delta);

  update public.profiles set
    rating = after_rating,
    rank_tier = public.rating_to_rank_tier(after_rating),
    wins = wins + case when actual_result = 'win' then 1 else 0 end,
    losses = losses + case when actual_result = 'loss' then 1 else 0 end,
    character_id = greatest(1, least(4, coalesce(p_character_id, character_id))),
    ghost_samples = array[
      coalesce(normalized[1], ghost_samples[1]),
      coalesce(normalized[2], ghost_samples[2]),
      coalesce(normalized[3], ghost_samples[3])
    ],
    updated_at = now()
  where id = pid returning * into me;

  update public.pvp_matches set
    status = 'complete', player_rounds = normalized,
    score_player = sp, score_opponent = so, result = actual_result,
    rating_before = me.rating - delta, rating_after = me.rating,
    rating_delta = delta, completed_at = now()
  where id = m.id;

  return jsonb_build_object(
    'match_id', m.id, 'rating_before', me.rating - delta,
    'rating_after', me.rating, 'rating_delta', delta,
    'rank_tier', me.rank_tier, 'wins', me.wins, 'losses', me.losses
  );
end;
$$;

create or replace function public.pvp_leaderboard(p_device_key text, limit_count integer default 50)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare pid uuid; entries jsonb; me_row jsonb;
begin
  perform public.pvp_login_device(p_device_key);
  select profile_id into pid from public.device_identities
  where device_key_hash = public.pvp_device_hash(p_device_key);

  select coalesce(jsonb_agg(to_jsonb(x) order by x.rank), '[]'::jsonb) into entries
  from (
    select id, display_name, character_id, null::integer as cosmetic_npc_id,
      rating, rank_tier, wins, losses,
      row_number() over(order by rating desc, wins desc, created_at asc)::integer as rank
    from public.profiles where is_bot = false
    order by rating desc, wins desc limit greatest(1, least(limit_count, 100))
  ) x;

  select to_jsonb(x) into me_row from (
    select id, display_name, rating, rank_tier, wins, losses,
      row_number() over(order by rating desc, wins desc, created_at asc)::integer as rank
    from public.profiles where is_bot = false
  ) x where x.id = pid;

  return jsonb_build_object('entries', entries, 'me', me_row);
end;
$$;

create or replace function public.pvp_history(p_device_key text, limit_count integer default 8)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare pid uuid; rows jsonb;
begin
  perform public.pvp_login_device(p_device_key);
  select profile_id into pid from public.device_identities
  where device_key_hash = public.pvp_device_hash(p_device_key);

  select coalesce(jsonb_agg(to_jsonb(x) order by x.completed_at desc), '[]'::jsonb)
  into rows
  from (
    select id, opponent_name, opponent_character_id, result,
      score_player, score_opponent, rating_delta, completed_at
    from public.pvp_matches
    where player_id = pid and status = 'complete'
    order by completed_at desc
    limit greatest(1, least(limit_count, 30))
  ) x;
  return rows;
end;
$$;

revoke all on table public.profiles, public.device_identities, public.pvp_matches
  from anon, authenticated;
revoke execute on function public.rating_to_rank_tier(integer) from public;
revoke execute on function public.pvp_device_hash(text) from public;
revoke execute on function public.pvp_new_alias() from public;
revoke execute on function public.pvp_login_device(text) from public;
revoke execute on function public.pvp_reroll_display_name(text) from public;
revoke execute on function public.pvp_update_profile(text,integer,integer,boolean) from public;
revoke execute on function public.pvp_matchmake(text) from public;
revoke execute on function public.pvp_submit_match(text,uuid,boolean,integer[],integer[],integer,integer,text,integer,integer) from public;
revoke execute on function public.pvp_leaderboard(text,integer) from public;
revoke execute on function public.pvp_history(text,integer) from public;
grant execute on function public.pvp_login_device(text) to anon, authenticated;
grant execute on function public.pvp_reroll_display_name(text) to anon, authenticated;
grant execute on function public.pvp_update_profile(text,integer,integer,boolean) to anon, authenticated;
grant execute on function public.pvp_matchmake(text) to anon, authenticated;
grant execute on function public.pvp_submit_match(text,uuid,boolean,integer[],integer[],integer,integer,text,integer,integer) to anon, authenticated;
grant execute on function public.pvp_leaderboard(text,integer) to anon, authenticated;
grant execute on function public.pvp_history(text,integer) to anon, authenticated;
