-- HIGH NOON Bounty Ranking V3 — remote reconciliation
--
-- Brings a donor-era database (feat/async-ranking: plaintext device_identities,
-- no pvp_matches, client-trusted submit RPCs, default anon table grants) to the
-- dev-2.0 baseline contract. Also converges when 20260830/20260831/20260907
-- were already applied, so a fresh database can run all four in order.
--
-- Additive and data preserving:
--   * no DROP TABLE / TRUNCATE / DELETE; rating, wins, losses, aliases untouched
--   * plaintext device_identities.device_key is kept (hash added alongside)
--   * legacy RPCs lose client EXECUTE but are not dropped
--   * profiles RLS policies are left in place (inert once table grants are revoked)
--
-- Validated against the real remote shape (tests/fixtures/donor-era-remote.sql,
-- generated from the 2026-09-27 read-only backup): donor tables `matches`,
-- `ghost_loads`, view `leaderboard`, 20 seeded bot profiles, auth triggers.
--
-- The whole file runs in one transaction. The final contract assertion aborts
-- (and rolls back everything) if the resulting schema is not the V3 baseline,
-- so an old table silently kept by IF NOT EXISTS cannot slip through.

begin;

create extension if not exists pgcrypto with schema extensions;

-- pgcrypto may live in `extensions` (Supabase default) or `public` (older setups).
select set_config('search_path', 'public, extensions', true);

-- ---------------------------------------------------------------------------
-- 1. profiles: add ghost_samples / alias_changed_at
--
-- A human ghost is an actually recorded human duel. ghost_samples stays NULL
-- until the player completes ranked rounds; nothing is synthesized from rating.
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists ghost_samples integer[] null;
alter table public.profiles alter column ghost_samples drop default;
alter table public.profiles alter column ghost_samples drop not null;
alter table public.profiles add column if not exists alias_changed_at timestamptz null;

alter table public.profiles drop constraint if exists profile_ghost_samples_len;
alter table public.profiles add constraint profile_ghost_samples_len
  check (ghost_samples is null or array_length(ghost_samples, 1) = 3);

-- Donor-era human ghosts live in ghost_loads (one recorded submission each).
-- Import only three distinct recorded rounds: the donor RPC padded records with
-- fewer than three valid rounds by repeating the last value, and a padded
-- record is not an actual three-round duel. Bot rows are never imported.
do $$
begin
  if to_regclass('public.ghost_loads') is not null then
    execute $imp$
      update public.profiles p
      set ghost_samples = g.sample_ms
      from public.ghost_loads g
      where g.user_id = p.id
        and p.is_bot = false
        and p.ghost_samples is null
        and array_length(g.sample_ms, 1) = 3
        and g.sample_ms[1] between 80 and 2500
        and g.sample_ms[2] between 80 and 2500
        and g.sample_ms[3] between 80 and 2500
        and g.sample_ms[2] <> g.sample_ms[3]
        and g.sample_ms[1] <> g.sample_ms[2]
    $imp$;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. device_identities: hashed lookup key, plaintext kept for continuity
-- ---------------------------------------------------------------------------

alter table public.device_identities add column if not exists device_key_hash text;
-- Present on donor databases; nullable legacy column on fresh baselines.
alter table public.device_identities add column if not exists device_key text;

-- Same bytes as pvp_device_hash(): sha256 over the key text, lowercase hex.
update public.device_identities
set device_key_hash = encode(digest(device_key, 'sha256'), 'hex')
where device_key_hash is null and device_key is not null;

do $$
declare
  pk_name text;
  pk_cols text[];
begin
  if exists (select 1 from public.device_identities where device_key_hash is null) then
    raise exception 'reconcile: device_identities row without device_key or device_key_hash';
  end if;

  select c.conname, array_agg(a.attname::text order by a.attname)
  into pk_name, pk_cols
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
  where c.conrelid = 'public.device_identities'::regclass and c.contype = 'p'
  group by c.conname;

  -- Donor PK is the plaintext key. Move the PK to the hash; plaintext stays
  -- unique through a partial index so legacy lookups keep working.
  if pk_name is not null and pk_cols <> array['device_key_hash'] then
    if exists (
      select 1 from pg_constraint
      where contype = 'f' and confrelid = 'public.device_identities'::regclass
    ) then
      raise exception 'reconcile: unexpected foreign key referencing device_identities';
    end if;
    execute format('alter table public.device_identities drop constraint %I', pk_name);
    pk_name := null;
  end if;

  alter table public.device_identities alter column device_key drop not null;
  alter table public.device_identities alter column device_key_hash set not null;

  if pk_name is null then
    alter table public.device_identities
      add constraint device_identities_pkey primary key (device_key_hash);
  end if;
end;
$$;

create unique index if not exists device_identities_device_key_uidx
  on public.device_identities (device_key) where device_key is not null;

-- ---------------------------------------------------------------------------
-- 3. pvp_matches (immutable assignment + settlement), same contract as 20260830
-- ---------------------------------------------------------------------------

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
create index if not exists pvp_matches_player_opponent_assigned_idx
  on public.pvp_matches (player_id, opponent_id, created_at desc) where status = 'assigned';
create index if not exists profiles_rating_idx
  on public.profiles (rating desc, wins desc);

alter table public.profiles enable row level security;
alter table public.device_identities enable row level security;
alter table public.pvp_matches enable row level security;

-- Databases built from 20260830 stamped the placeholder [520,500,540] on every
-- profile. Where no ranked match was ever completed it is not a human record.
-- (No-op on the donor-era remote, where the column was just added as NULL.)
update public.profiles p set ghost_samples = null
where p.ghost_samples = array[520, 500, 540]
  and not exists (
    select 1 from public.pvp_matches m where m.player_id = p.id and m.status = 'complete'
  );

-- ---------------------------------------------------------------------------
-- 4. Identity helpers
-- ---------------------------------------------------------------------------

-- The donor remote declares rating_to_rank_tier(r integer) with the same
-- thresholds; PostgreSQL cannot rename an input parameter in CREATE OR REPLACE,
-- so an existing definition is kept and only a missing one is created.
do $$
begin
  if to_regprocedure('public.rating_to_rank_tier(integer)') is null then
    execute $fn$
      create function public.rating_to_rank_tier(p_rating integer)
      returns text language sql immutable as $body$
        select case
          when p_rating < 1000 then 'bronze'
          when p_rating < 1200 then 'silver'
          when p_rating < 1400 then 'gold'
          when p_rating < 1600 then 'platinum'
          else 'diamond'
        end
      $body$
    $fn$;
  end if;
end;
$$;

create or replace function public.pvp_device_hash(p_device_key text)
returns text language plpgsql immutable
set search_path = public, extensions as $$
begin
  if p_device_key is null or char_length(p_device_key) < 32 or char_length(p_device_key) > 256 then
    raise exception 'invalid_device_key';
  end if;
  return encode(digest(p_device_key, 'sha256'), 'hex');
end;
$$;

-- New installs without a JS CSPRNG get their installation secret from pgcrypto.
-- The secret is returned once and never stored or logged in plaintext.
-- SECURITY DEFINER so it does not depend on anon's USAGE on the extensions schema.
create or replace function public.pvp_issue_device_key()
returns text language sql volatile security definer
set search_path = public, extensions as $$
  select encode(gen_random_bytes(32), 'hex')
$$;

-- Donor-era alias generator (large pool, reserved NPC names). Internal only.
create or replace function public.pvp_pick_western_alias(
  p_exclude_profile_id uuid default null,
  p_not_equal text default null
)
returns text
language plpgsql
set search_path = public
as $$
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
        || ' ' || nouns[1 + floor(random() * array_length(nouns, 1))::int];
    elsif roll = 1 then
      candidate := givens[1 + floor(random() * array_length(givens, 1))::int]
        || ' ' || surnames[1 + floor(random() * array_length(surnames, 1))::int];
    elsif roll = 2 then
      candidate := epithets[1 + floor(random() * array_length(epithets, 1))::int]
        || ' ' || surnames[1 + floor(random() * array_length(surnames, 1))::int];
    else
      candidate := prefixes[1 + floor(random() * array_length(prefixes, 1))::int]
        || ' ' || nouns[1 + floor(random() * array_length(nouns, 1))::int];
    end if;

    continue when candidate = p_not_equal;
    continue when candidate = any (reserved);
    continue when char_length(candidate) > 22;
    if not exists (
      select 1 from public.profiles
      where display_name = candidate
        and (p_exclude_profile_id is null or id is distinct from p_exclude_profile_id)
    ) then
      return candidate;
    end if;
  end loop;

  base := epithets[1 + floor(random() * array_length(epithets, 1))::int]
    || ' ' || nouns[1 + floor(random() * array_length(nouns, 1))::int];
  foreach roman in array romans loop
    candidate := base || ' ' || roman;
    if candidate is distinct from p_not_equal
      and not exists (
        select 1 from public.profiles
        where display_name = candidate
          and (p_exclude_profile_id is null or id is distinct from p_exclude_profile_id)
      )
    then
      return candidate;
    end if;
  end loop;

  return 'Drifter ' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
end;
$$;

-- Resolve (or create) the profile behind an installation key.
-- 1) hashed lookup  2) legacy plaintext lookup, backfilling the hash
create or replace function public.pvp_resolve_profile(p_device_key text, p_create boolean)
returns uuid
language plpgsql
set search_path = public, extensions
as $$
declare
  key_hash text := public.pvp_device_hash(p_device_key);
  pid uuid;
begin
  select profile_id into pid from public.device_identities where device_key_hash = key_hash;
  if pid is not null then
    return pid;
  end if;

  select profile_id into pid from public.device_identities where device_key = p_device_key;
  if pid is not null then
    update public.device_identities set device_key_hash = key_hash
    where device_key = p_device_key;
    return pid;
  end if;

  if not p_create then
    raise exception 'player_not_found';
  end if;

  pid := gen_random_uuid();
  insert into public.profiles (
    id, display_name, character_id, rating, rank_tier, wins, losses, is_bot,
    created_at, updated_at
  ) values (
    pid, public.pvp_pick_western_alias(pid, null), 1, 1000,
    public.rating_to_rank_tier(1000), 0, 0, false, now(), now()
  );
  -- New installs are stored by hash only; no plaintext secret at rest.
  insert into public.device_identities (device_key_hash, profile_id, created_at)
  values (key_hash, pid, now());
  return pid;
end;
$$;

-- VOLATILE on purpose: a STABLE function would read with the caller's snapshot
-- and miss a profile inserted earlier in the same statement (first login).
create or replace function public.pvp_profile_json(p_profile_id uuid)
returns jsonb
language sql volatile
set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'display_name', p.display_name,
    'character_id', p.character_id, 'cosmetic_npc_id', null,
    'rating', p.rating, 'rank_tier', p.rank_tier,
    'wins', p.wins, 'losses', p.losses
  )
  from public.profiles p where p.id = p_profile_id
$$;

-- ---------------------------------------------------------------------------
-- 5. Client-facing identity RPCs
-- ---------------------------------------------------------------------------

create or replace function public.pvp_login_device(p_device_key text)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
begin
  return public.pvp_profile_json(public.pvp_resolve_profile(p_device_key, true));
end;
$$;

create or replace function public.pvp_reroll_display_name(p_device_key text)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
declare
  pid uuid := public.pvp_resolve_profile(p_device_key, false);
  rec public.profiles;
begin
  select * into rec from public.profiles where id = pid for update;
  if rec.alias_changed_at is not null
     and rec.alias_changed_at > now() - interval '10 seconds' then
    raise exception 'alias_cooldown';
  end if;
  update public.profiles
  set display_name = public.pvp_pick_western_alias(pid, rec.display_name),
      alias_changed_at = now(), updated_at = now()
  where id = pid;
  return public.pvp_profile_json(pid);
end;
$$;

create or replace function public.pvp_update_profile(
  p_device_key text,
  p_character_id integer default null,
  p_cosmetic_npc_id integer default null,
  p_clear_cosmetic boolean default false
)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
declare
  pid uuid := public.pvp_resolve_profile(p_device_key, true);
begin
  update public.profiles set
    character_id = case
      when p_character_id is not null then greatest(1, least(4, p_character_id))
      else character_id
    end,
    cosmetic_npc_id = null,
    updated_at = now()
  where id = pid;
  return public.pvp_profile_json(pid);
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Ranked match lifecycle: matchmake -> submit / forfeit (idempotent)
-- ---------------------------------------------------------------------------

-- Donor-era seeded bots (profiles.is_bot + ghost_loads). Explicit bots only;
-- on databases without ghost_loads this returns no row.
do $$
begin
  if to_regclass('public.ghost_loads') is not null then
    execute $fn$
      create or replace function public.pvp_pick_seeded_bot(p_rating integer)
      returns table (bot_id uuid, bot_name text, bot_character integer,
                     bot_rating integer, bot_tier text, bot_samples integer[])
      language sql stable set search_path = public as $body$
        select p.id, p.display_name, greatest(1, least(4, coalesce(g.character_id, p.character_id))),
               p.rating, p.rank_tier, g.sample_ms
        from public.profiles p
        join public.ghost_loads g on g.user_id = p.id
        where p.is_bot = true and array_length(g.sample_ms, 1) = 3
        order by abs(p.rating - p_rating), random()
        limit 1
      $body$
    $fn$;
  else
    execute $fn$
      create or replace function public.pvp_pick_seeded_bot(p_rating integer)
      returns table (bot_id uuid, bot_name text, bot_character integer,
                     bot_rating integer, bot_tier text, bot_samples integer[])
      language sql stable set search_path = public as $body$
        select null::uuid, null::text, null::integer, null::integer, null::text, null::integer[]
        where false
      $body$
    $fn$;
  end if;

  -- Donor-era completed matches (public.matches), read-only, for history continuity.
  if to_regclass('public.matches') is not null then
    execute $fn$
      create or replace function public.pvp_legacy_history(p_player_id uuid, p_limit integer)
      returns jsonb language sql stable set search_path = public as $body$
        select coalesce(jsonb_agg(to_jsonb(x) order by x.completed_at desc), '[]'::jsonb)
        from (
          select m.id, coalesce(o.display_name, 'Outlaw') as opponent_name,
                 coalesce(o.character_id, 1) as opponent_character_id, m.result,
                 m.score_player, m.score_opponent, m.rating_delta, m.created_at as completed_at
          from public.matches m
          left join public.profiles o on o.id = m.opponent_id
          where m.player_id = p_player_id
          order by m.created_at desc
          limit greatest(1, least(p_limit, 30))
        ) x
      $body$
    $fn$;
  else
    execute $fn$
      create or replace function public.pvp_legacy_history(p_player_id uuid, p_limit integer)
      returns jsonb language sql stable set search_path = public as $body$
        select '[]'::jsonb
      $body$
    $fn$;
  end if;
end;
$$;

create or replace function public.pvp_matchmake(p_device_key text)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
declare
  pid uuid := public.pvp_resolve_profile(p_device_key, true);
  me public.profiles;
  opp public.profiles;
  match_row public.pvp_matches;
  bot_samples integer[3];
  seeded record;
begin
  select * into me from public.profiles where id = pid;

  -- Human ghosts only from players with a fully recorded set of ranked rounds.
  select * into opp from public.profiles
  where id <> me.id and is_bot = false and abs(rating - me.rating) <= 300
    and ghost_samples is not null and array_position(ghost_samples, null) is null
  order by abs(rating - me.rating), random() limit 1;

  -- No eligible human: an explicit bot. Prefer the seeded bot profiles
  -- (is_bot = true); otherwise a generated bot with no profile.
  if opp.id is null then
    select * into seeded from public.pvp_pick_seeded_bot(me.rating);
    if found then
      insert into public.pvp_matches(
        player_id, opponent_id, opponent_name, opponent_character_id, opponent_rating,
        opponent_rank_tier, opponent_is_bot, opponent_samples
      ) values (
        me.id, seeded.bot_id, seeded.bot_name, seeded.bot_character, seeded.bot_rating,
        seeded.bot_tier, true, seeded.bot_samples
      ) returning * into match_row;
    else
      bot_samples := array[
        greatest(120, least(650, 430 - (me.rating - 1000) / 4)),
        greatest(120, least(650, 470 - (me.rating - 1000) / 4)),
        greatest(120, least(650, 450 - (me.rating - 1000) / 4))
      ];
      insert into public.pvp_matches(
        player_id, opponent_name, opponent_character_id, opponent_rating,
        opponent_rank_tier, opponent_is_bot, opponent_samples
      ) values (
        me.id, 'Dust Drifter', 1 + floor(random() * 4)::int, me.rating,
        public.rating_to_rank_tier(me.rating), true, bot_samples
      ) returning * into match_row;
    end if;
  else
    insert into public.pvp_matches(
      player_id, opponent_id, opponent_name, opponent_character_id,
      opponent_rating, opponent_rank_tier, opponent_is_bot, opponent_samples
    ) values (
      me.id, opp.id, opp.display_name, greatest(1, least(4, opp.character_id)),
      opp.rating, opp.rank_tier, false, opp.ghost_samples
    ) returning * into match_row;
  end if;

  return jsonb_build_object(
    'match_id', match_row.id,
    'player', public.pvp_profile_json(me.id),
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

-- Stored settlement of a completed match (the idempotent response).
create or replace function public.pvp_match_settlement(p_match public.pvp_matches, p_already boolean)
returns jsonb language sql volatile
set search_path = public as $$
  select jsonb_build_object(
    'match_id', p_match.id,
    'rating_before', p_match.rating_before,
    'rating_after', p_match.rating_after,
    'rating_delta', p_match.rating_delta,
    'result', p_match.result,
    'score_player', p_match.score_player,
    'score_opponent', p_match.score_opponent,
    'rank_tier', p.rank_tier,
    'wins', p.wins,
    'losses', p.losses,
    'already_completed', p_already
  )
  from public.profiles p where p.id = p_match.player_id
$$;

-- Server-side scoring + Elo for a locked, assigned match.
create or replace function public.pvp_finalize_match(p_match_id uuid, p_player_rounds integer[])
returns jsonb language plpgsql
set search_path = public, extensions as $$
declare
  m public.pvp_matches;
  me public.profiles;
  i integer;
  mine integer;
  theirs integer;
  sp integer := 0;
  so integer := 0;
  actual_result text;
  expected numeric;
  delta integer;
  before_rating integer;
  after_rating integer;
  normalized integer[3] := array[null, null, null];
begin
  select * into m from public.pvp_matches where id = p_match_id;

  for i in 1..least(3, coalesce(array_length(p_player_rounds, 1), 0)) loop
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
  -- No rounds submitted at all (forfeit before round 1) is a 0-2 loss.
  if coalesce(array_length(p_player_rounds, 1), 0) = 0 then
    so := 2;
  end if;

  actual_result := case when sp > so then 'win' when so > sp then 'loss' else 'draw' end;
  select * into me from public.profiles where id = m.player_id for update;
  before_rating := me.rating;
  expected := 1.0 / (1.0 + power(10.0, (m.opponent_rating - me.rating)::numeric / 400.0));
  delta := round(32 * ((case actual_result when 'win' then 1.0 when 'draw' then 0.5 else 0.0 end) - expected))::int;
  after_rating := greatest(0, before_rating + delta);

  update public.profiles set
    rating = after_rating,
    rank_tier = public.rating_to_rank_tier(after_rating),
    wins = wins + case when actual_result = 'win' then 1 else 0 end,
    losses = losses + case when actual_result = 'loss' then 1 else 0 end,
    -- Only recorded rounds update the ghost; a forfeit records nothing.
    ghost_samples = case
      when normalized[1] is null and normalized[2] is null and normalized[3] is null
        then ghost_samples
      else array[
        coalesce(normalized[1], ghost_samples[1]),
        coalesce(normalized[2], ghost_samples[2]),
        coalesce(normalized[3], ghost_samples[3])
      ]
    end,
    updated_at = now()
  where id = me.id;

  update public.pvp_matches set
    status = 'complete', player_rounds = normalized,
    score_player = sp, score_opponent = so, result = actual_result,
    rating_before = before_rating, rating_after = after_rating,
    rating_delta = after_rating - before_rating, completed_at = now()
  where id = m.id
  returning * into m;

  return public.pvp_match_settlement(m, false);
end;
$$;

-- Locks and returns the caller's match.
--
-- p_match_ref is a match id (V3 clients). If no match with that id exists at
-- all and p_allow_legacy is set, it is treated as a donor-era opponent profile
-- id: accepted only when the caller has exactly one live assigned match
-- against that opponent. More than one raises legacy_match_ambiguous and
-- nothing is finalized.
create or replace function public.pvp_lock_match(
  p_player_id uuid,
  p_match_ref uuid,
  p_allow_legacy boolean
)
returns public.pvp_matches language plpgsql
set search_path = public as $$
declare
  m public.pvp_matches;
  candidates uuid[];
begin
  if exists (select 1 from public.pvp_matches where id = p_match_ref) then
    select * into m from public.pvp_matches
    where id = p_match_ref and player_id = p_player_id
    for update;
    return m;  -- null when the match belongs to someone else
  end if;

  if not p_allow_legacy then
    return m;
  end if;

  select array_agg(id) into candidates
  from public.pvp_matches
  where player_id = p_player_id and opponent_id = p_match_ref
    and status = 'assigned' and expires_at > now();

  if coalesce(cardinality(candidates), 0) > 1 then
    raise exception 'legacy_match_ambiguous';
  end if;
  if coalesce(cardinality(candidates), 0) = 1 then
    select * into m from public.pvp_matches where id = candidates[1] for update;
  end if;
  return m;
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
  p_character_id integer default 1,  -- matches the remote default (defaults cannot be removed)
  p_cosmetic_npc_id integer default null
)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
-- Client score/result/opponent rounds are wire compatibility only; the server
-- recomputes everything from the stored assignment.
declare
  pid uuid := public.pvp_resolve_profile(p_device_key, false);
  m public.pvp_matches;
  settlement jsonb;
begin
  m := public.pvp_lock_match(pid, p_opponent_id, true);
  if m.id is null then
    raise exception 'match_not_found_or_expired';
  end if;
  if m.status = 'complete' then
    return public.pvp_match_settlement(m, true);
  end if;
  if m.expires_at <= now() then
    raise exception 'match_not_found_or_expired';
  end if;

  settlement := public.pvp_finalize_match(m.id, p_player_rounds);
  update public.profiles
  set character_id = greatest(1, least(4, coalesce(p_character_id, character_id)))
  where id = pid;
  return settlement;
end;
$$;

create or replace function public.pvp_forfeit_match(p_device_key text, p_match_id uuid)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
declare
  pid uuid := public.pvp_resolve_profile(p_device_key, false);
  m public.pvp_matches;
begin
  -- Forfeit is V3-only: match id, no legacy profile-id resolution.
  m := public.pvp_lock_match(pid, p_match_id, false);
  if m.id is null then
    raise exception 'match_not_found_or_expired';
  end if;
  if m.status = 'complete' then
    return public.pvp_match_settlement(m, true);
  end if;
  if m.expires_at <= now() then
    raise exception 'match_not_found_or_expired';
  end if;
  return public.pvp_finalize_match(m.id, array[null, null, null]::integer[]);
end;
$$;

create or replace function public.pvp_leaderboard(p_device_key text, limit_count integer default 50)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
declare
  pid uuid := public.pvp_resolve_profile(p_device_key, true);
  entries jsonb;
  me_row jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x) order by x.rank), '[]'::jsonb) into entries
  from (
    select id, display_name, character_id, null::integer as cosmetic_npc_id,
      rating, rank_tier, wins, losses,
      row_number() over (order by rating desc, wins desc, created_at asc)::integer as rank
    from public.profiles where is_bot = false
    order by rating desc, wins desc, created_at asc
    limit greatest(1, least(limit_count, 100))
  ) x;

  select to_jsonb(x) into me_row from (
    select id, display_name, rating, rank_tier, wins, losses,
      row_number() over (order by rating desc, wins desc, created_at asc)::integer as rank
    from public.profiles where is_bot = false
  ) x where x.id = pid;

  return jsonb_build_object('entries', entries, 'me', me_row);
end;
$$;

create or replace function public.pvp_history(p_device_key text, limit_count integer default 8)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
declare
  pid uuid := public.pvp_resolve_profile(p_device_key, true);
  rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x) order by x.completed_at desc), '[]'::jsonb)
  into rows
  from (
    select id, opponent_name, opponent_character_id, result,
      score_player, score_opponent, rating_delta, completed_at
    from public.pvp_matches
    where player_id = pid and status = 'complete'
    union all
    select (e->>'id')::uuid, e->>'opponent_name', (e->>'opponent_character_id')::integer,
           e->>'result', (e->>'score_player')::integer, (e->>'score_opponent')::integer,
           (e->>'rating_delta')::integer, (e->>'completed_at')::timestamptz
    from jsonb_array_elements(public.pvp_legacy_history(pid, limit_count)) e
    order by completed_at desc
    limit greatest(1, least(limit_count, 30))
  ) x;
  return rows;
end;
$$;

-- Lets clients detect this baseline before enabling ranked retry.
create or replace function public.pvp_capabilities()
returns jsonb language sql stable
set search_path = public as $$
  select jsonb_build_object(
    'contract', 'v3-baseline-20260927',
    'ranked_submit_idempotent', true,
    'forfeit_rpc', true,
    'device_key_hash', true
  )
$$;

-- ---------------------------------------------------------------------------
-- 7. Daily duel (server recalculation + race-free creation)
-- ---------------------------------------------------------------------------

create or replace function public.pvp_get_daily(p_device_key text)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
declare
  pid uuid := public.pvp_resolve_profile(p_device_key, true);
  d date := (timezone('utc', now()))::date;
  ch public.daily_challenges;
  done public.daily_completions;
  has_done boolean;
begin
  -- Concurrent first requests: one insert wins, everyone reads the same row.
  insert into public.daily_challenges (challenge_date, opponent_name, sample_ms, character_id)
  values (
    d,
    'Daily Outlaw #' || to_char(d, 'MMDD'),
    array[
      200 + floor(random() * 120)::int,
      200 + floor(random() * 120)::int,
      200 + floor(random() * 120)::int
    ],
    1 + floor(random() * 4)::int
  )
  on conflict (challenge_date) do nothing;

  select * into ch from public.daily_challenges where challenge_date = d;

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
$$;

create or replace function public.pvp_submit_daily(
  p_device_key text,
  p_player_rounds integer[],
  p_score_player integer,
  p_score_opponent integer,
  p_result text,
  p_shared boolean default false
)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
declare
  pid uuid := public.pvp_resolve_profile(p_device_key, true);
  d date := (timezone('utc', now()))::date;
  ch public.daily_challenges;
  existing public.daily_completions;
  avg_v int;
  valid int := 0;
  sum_ms int := 0;
  score_p int := 0;
  score_o int := 0;
  actual_result text;
  i int;
  ms int;
begin
  select * into ch from public.daily_challenges where challenge_date = d;
  if not found then
    raise exception 'no daily challenge';
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
      if ms is null or ms < 80 or ms > 2500 then
        score_o := score_o + 1;
      elsif ms < ch.sample_ms[i] then
        score_p := score_p + 1;
      elsif ms > ch.sample_ms[i] then
        score_o := score_o + 1;
      end if;
      exit when score_p >= 2 or score_o >= 2;
    end loop;
  end if;
  avg_v := case when valid > 0 then round(sum_ms::numeric / valid)::int else null end;
  actual_result := case when score_p > score_o then 'win' when score_o > score_p then 'loss' else 'draw' end;

  insert into public.daily_completions (
    profile_id, challenge_date, score_player, score_opponent,
    result, player_rounds, avg_ms, shared
  ) values (
    pid, d, score_p, score_o,
    actual_result, p_player_rounds[1:3], avg_v, coalesce(p_shared, false)
  )
  on conflict (profile_id, challenge_date) do nothing;

  -- A concurrent duplicate lost the race: answer like a repeat submit.
  if not found then
    return public.pvp_submit_daily(p_device_key, p_player_rounds, p_score_player,
                                   p_score_opponent, p_result, p_shared);
  end if;

  return jsonb_build_object(
    'already_completed', false,
    'challenge_date', d,
    'result', actual_result,
    'score_player', score_p,
    'score_opponent', score_o,
    'avg_ms', avg_v,
    'shared', coalesce(p_shared, false),
    'badge', 'daily_duelist'
  );
end;
$$;

create or replace function public.pvp_mark_daily_shared(p_device_key text)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
declare
  pid uuid := public.pvp_resolve_profile(p_device_key, true);
  d date := (timezone('utc', now()))::date;
  updated int;
begin
  update public.daily_completions set shared = true
  where profile_id = pid and challenge_date = d;
  get diagnostics updated = row_count;
  if updated = 0 then
    raise exception 'daily not completed';
  end if;
  return jsonb_build_object('ok', true, 'badge', 'daily_duelist');
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Friend challenge (server recalculation)
-- ---------------------------------------------------------------------------

create or replace function public._friend_challenge_code()
returns text language plpgsql
set search_path = public as $$
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

create or replace function public.pvp_create_friend_challenge(
  p_device_key text,
  p_sample_ms integer[],
  p_score_creator integer default 0,
  p_creator_avg_ms integer default null,
  p_creator_best_ms integer default null,
  p_character_id integer default 1,
  p_cosmetic_npc_id integer default null
)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
declare
  pid uuid := public.pvp_resolve_profile(p_device_key, true);
  creator_name text;
  code text;
  tries int := 0;
  row public.friend_challenges;
  s1 int; s2 int; s3 int;
begin
  if p_sample_ms is null or array_length(p_sample_ms, 1) is distinct from 3 then
    raise exception 'invalid_sample_ms';
  end if;
  select display_name into creator_name from public.profiles where id = pid;

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
        code, pid, coalesce(creator_name, 'Outlaw'),
        array[s1, s2, s3],
        greatest(1, least(4, coalesce(p_character_id, 1))),
        null,
        case when p_creator_avg_ms between 80 and 2500 then p_creator_avg_ms end,
        case when p_creator_best_ms between 80 and 2500 then p_creator_best_ms end,
        least(3, greatest(0, coalesce(p_score_creator, 0)))
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

create or replace function public.pvp_get_friend_challenge(p_device_key text, p_code text)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
declare
  pid uuid := public.pvp_resolve_profile(p_device_key, true);
  row public.friend_challenges;
  attempt public.friend_challenge_attempts;
  normalized text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  has_attempt boolean;
begin
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

  select * into attempt from public.friend_challenge_attempts
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

create or replace function public.pvp_submit_friend_challenge(
  p_device_key text,
  p_code text,
  p_player_rounds integer[],
  p_score_player integer,
  p_score_creator integer,
  p_result text
)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
declare
  pid uuid := public.pvp_resolve_profile(p_device_key, true);
  challenger_name text;
  row public.friend_challenges;
  existing public.friend_challenge_attempts;
  normalized text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
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
  if row.creator_id = pid then
    raise exception 'cannot_challenge_self';
  end if;

  select * into existing from public.friend_challenge_attempts
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
  select display_name into challenger_name from public.profiles where id = pid;

  insert into public.friend_challenge_attempts (
    challenge_id, challenger_id, challenger_name, player_rounds,
    score_player, score_creator, result, avg_ms, best_ms
  ) values (
    row.id, pid, coalesce(challenger_name, 'Challenger'), p_player_rounds[1:3],
    score_p, score_c, actual_result, avg_v, best_v
  )
  on conflict (challenge_id, challenger_id) do nothing;

  if not found then
    return public.pvp_submit_friend_challenge(p_device_key, p_code, p_player_rounds,
                                              p_score_player, p_score_creator, p_result);
  end if;

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

-- ---------------------------------------------------------------------------
-- 9. Privileges: RPC-only access
-- ---------------------------------------------------------------------------

-- Direct table access for API roles (existing RLS policies become inert).
do $$
declare
  t text;
  seq text;
begin
  foreach t in array array[
    'profiles', 'device_identities', 'pvp_matches',
    'daily_challenges', 'daily_completions',
    'friend_challenges', 'friend_challenge_attempts',
    'analytics_app_events', 'analytics_match_events', 'app_settings',
    'matches', 'ghost_loads', 'leaderboard'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke all on table public.%I from anon, authenticated', t);
    end if;
  end loop;

  seq := pg_get_serial_sequence('public.analytics_app_events', 'id');
  if seq is not null then
    execute format('revoke all on sequence %s from anon, authenticated', seq);
  end if;
end;
$$;

-- Internal helpers: never callable through the API.
revoke all on function public.rating_to_rank_tier(integer) from public, anon, authenticated;
revoke all on function public.pvp_device_hash(text) from public, anon, authenticated;
revoke all on function public.pvp_pick_western_alias(uuid, text) from public, anon, authenticated;
revoke all on function public.pvp_resolve_profile(text, boolean) from public, anon, authenticated;
revoke all on function public.pvp_profile_json(uuid) from public, anon, authenticated;
revoke all on function public.pvp_match_settlement(public.pvp_matches, boolean) from public, anon, authenticated;
revoke all on function public.pvp_finalize_match(uuid, integer[]) from public, anon, authenticated;
revoke all on function public.pvp_lock_match(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public._friend_challenge_code() from public, anon, authenticated;
revoke all on function public.pvp_pick_seeded_bot(integer) from public, anon, authenticated;
revoke all on function public.pvp_legacy_history(uuid, integer) from public, anon, authenticated;

-- Client-facing RPCs: explicit anon/authenticated EXECUTE only.
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.pvp_issue_device_key()',
    'public.pvp_login_device(text)',
    'public.pvp_reroll_display_name(text)',
    'public.pvp_update_profile(text,integer,integer,boolean)',
    'public.pvp_matchmake(text)',
    'public.pvp_submit_match(text,uuid,boolean,integer[],integer[],integer,integer,text,integer,integer)',
    'public.pvp_forfeit_match(text,uuid)',
    'public.pvp_leaderboard(text,integer)',
    'public.pvp_history(text,integer)',
    'public.pvp_capabilities()',
    'public.pvp_get_daily(text)',
    'public.pvp_submit_daily(text,integer[],integer,integer,text,boolean)',
    'public.pvp_mark_daily_shared(text)',
    'public.pvp_create_friend_challenge(text,integer[],integer,integer,integer,integer,integer)',
    'public.pvp_get_friend_challenge(text,text)',
    'public.pvp_submit_friend_challenge(text,text,integer[],integer,integer,text)',
    'public.analytics_record_event(text,text,text,text,jsonb)'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke all on function %s from public', f);
      execute format('grant execute on function %s to anon, authenticated', f);
    end if;
  end loop;
end;
$$;

-- Donor-era RPCs not used by the V3 app: keep the functions, remove client
-- EXECUTE. admin_get_overview is PIN-gated and must not be reachable by anon.
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.admin_get_overview(text)',
    'public.analytics_record_match(text,text,text,integer,boolean,integer,integer,numeric,integer)',
    'public.pvp_set_cosmetic_npc(text,integer)',
    'public.pvp_new_alias()',
    -- seed_ranking_bots deletes bot profiles and their matches: never client-callable
    'public.seed_ranking_bots()',
    'public.ensure_my_profile()',
    'public.elo_expected(integer,integer)',
    -- trigger functions keep firing; direct calls are not needed
    'public.handle_new_user()',
    'public.cleanup_profile_on_user_delete()',
    'public.touch_updated_at()'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke all on function %s from public, anon, authenticated', f);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Contract assertion — abort the whole migration unless the V3 baseline holds
-- ---------------------------------------------------------------------------

do $$
declare
  problems text[] := array[]::text[];
  r record;
begin
  for r in
    select * from (values
      ('profiles','id','uuid'),('profiles','display_name','text'),('profiles','character_id','integer'),
      ('profiles','rating','integer'),('profiles','rank_tier','text'),('profiles','wins','integer'),
      ('profiles','losses','integer'),('profiles','is_bot','boolean'),('profiles','ghost_samples','integer[]'),
      ('profiles','alias_changed_at','timestamp with time zone'),('profiles','created_at','timestamp with time zone'),
      ('device_identities','device_key_hash','text'),('device_identities','device_key','text'),
      ('device_identities','profile_id','uuid'),
      ('pvp_matches','id','uuid'),('pvp_matches','player_id','uuid'),('pvp_matches','opponent_id','uuid'),
      ('pvp_matches','opponent_name','text'),('pvp_matches','opponent_character_id','integer'),
      ('pvp_matches','opponent_rating','integer'),('pvp_matches','opponent_rank_tier','text'),
      ('pvp_matches','opponent_is_bot','boolean'),('pvp_matches','opponent_samples','integer[]'),
      ('pvp_matches','status','text'),('pvp_matches','player_rounds','integer[]'),
      ('pvp_matches','score_player','integer'),('pvp_matches','score_opponent','integer'),
      ('pvp_matches','result','text'),('pvp_matches','rating_before','integer'),
      ('pvp_matches','rating_after','integer'),('pvp_matches','rating_delta','integer'),
      ('pvp_matches','created_at','timestamp with time zone'),('pvp_matches','expires_at','timestamp with time zone'),
      ('pvp_matches','completed_at','timestamp with time zone'),
      ('daily_challenges','challenge_date','date'),('daily_challenges','sample_ms','integer[]'),
      ('daily_completions','profile_id','uuid'),('daily_completions','challenge_date','date'),
      ('daily_completions','player_rounds','integer[]'),
      ('friend_challenges','code','text'),('friend_challenges','sample_ms','integer[]'),
      ('friend_challenge_attempts','challenge_id','uuid'),('friend_challenge_attempts','challenger_id','uuid'),
      ('friend_challenge_attempts','player_rounds','integer[]')
    ) as e(tbl, col, typ)
  loop
    if not exists (
      select 1 from pg_attribute a join pg_class c on c.oid = a.attrelid
      where c.relnamespace = 'public'::regnamespace and c.relname = r.tbl
        and a.attname = r.col and not a.attisdropped
        and format_type(a.atttypid, a.atttypmod) = r.typ
    ) then
      problems := problems || (r.tbl || '.' || r.col || ' ' || r.typ);
    end if;
  end loop;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.device_identities'::regclass and contype = 'p'
      and conkey = array[(select attnum from pg_attribute
                          where attrelid = 'public.device_identities'::regclass
                            and attname = 'device_key_hash')]
  ) then
    problems := problems || 'device_identities primary key is not device_key_hash'::text;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.daily_challenges'::regclass and contype in ('p', 'u')
      and conkey = array[(select attnum from pg_attribute
                          where attrelid = 'public.daily_challenges'::regclass
                            and attname = 'challenge_date')]
  ) then
    problems := problems || 'daily_challenges.challenge_date is not unique'::text;
  end if;

  if not exists (
    select 1 from pg_index i
    where i.indrelid = 'public.daily_completions'::regclass and i.indisunique
      and (select array_agg(a.attname::text order by a.attname)
           from pg_attribute a
           where a.attrelid = i.indrelid and a.attnum = any (i.indkey))
          = array['challenge_date', 'profile_id']
  ) then
    problems := problems || 'daily_completions (profile_id, challenge_date) is not unique'::text;
  end if;

  if not exists (
    select 1 from pg_index i
    where i.indrelid = 'public.friend_challenge_attempts'::regclass and i.indisunique
      and (select array_agg(a.attname::text order by a.attname)
           from pg_attribute a
           where a.attrelid = i.indrelid and a.attnum = any (i.indkey))
          = array['challenge_id', 'challenger_id']
  ) then
    problems := problems || 'friend_challenge_attempts (challenge_id, challenger_id) is not unique'::text;
  end if;

  if exists (
    select 1 from pg_attribute a
    where a.attrelid = 'public.profiles'::regclass and a.attname = 'ghost_samples'
      and (a.attnotnull or a.atthasdef)
  ) then
    problems := problems || 'profiles.ghost_samples must be nullable without a synthetic default'::text;
  end if;

  if has_table_privilege('anon', 'public.profiles', 'SELECT')
     or has_table_privilege('anon', 'public.device_identities', 'SELECT')
     or has_table_privilege('anon', 'public.pvp_matches', 'SELECT') then
    problems := problems || 'anon still has direct table access'::text;
  end if;

  if exists (
    select 1 from unnest(array['matches', 'ghost_loads', 'leaderboard', 'app_settings']) t
    where to_regclass('public.' || t) is not null
      and (has_table_privilege('anon', to_regclass('public.' || t), 'SELECT,INSERT,UPDATE,DELETE')
        or has_table_privilege('authenticated', to_regclass('public.' || t), 'SELECT,INSERT,UPDATE,DELETE'))
  ) then
    problems := problems || 'anon/authenticated still reach donor tables or the leaderboard view'::text;
  end if;

  if to_regprocedure('public.seed_ranking_bots()') is not null
     and has_function_privilege('anon', 'public.seed_ranking_bots()', 'EXECUTE') then
    problems := problems || 'anon can still execute seed_ranking_bots'::text;
  end if;

  if to_regprocedure('public.admin_get_overview(text)') is not null
     and has_function_privilege('anon', 'public.admin_get_overview(text)', 'EXECUTE') then
    problems := problems || 'anon can still execute admin_get_overview'::text;
  end if;

  if cardinality(problems) > 0 then
    raise exception 'reconcile contract check failed: %', array_to_string(problems, '; ');
  end if;
end;
$$;

commit;
