-- HIGH NOON — Ghost Snapshot V2 (additive)
--
-- Replaces the "three integers" human ghost with a snapshot of ONE completed
-- ranked match: the rounds actually played (2 or 3). Best of 3 ends at 2
-- points, so 2-0 is complete.
--
-- Reaction contract (one rule for Ranked, Daily and Friend):
--   normalized_ms = round(raw_ms)            (client Math.round, half up)
--   valid reaction: 80 <= normalized_ms <= 2499
-- Round outcomes:
--   SHOT     input after BANG, valid          reaction_ms = normalized (80..2499)
--   INVALID  input after BANG, out of range   reaction_ms = normalized (kept for
--            audit: 0..79 too fast, 2500..10000 past the window); never a speed
--   EARLY    input before BANG                reaction_ms = null
--   TIMEOUT  no input                         reaction_ms = null
--
--   profiles.ghost_snapshot         latest valid snapshot (2 or 3 rounds)
--   profiles.ghost_replay_snapshot  latest valid 3-round snapshot = matchmaking pool
--   pvp_matches.opponent_snapshot   replay snapshot copied at matchmaking (immutable)
--   pvp_matches.player_round_detail the player's submitted rounds (V2 matches)
--
-- Replay policy (decided 2026-09-28): a 2-round snapshot cannot answer a round 3
-- (e.g. the new player is 1-1 after two rounds), and no round is ever invented.
-- So matchmaking replays only 3-round snapshots; a 2-0 match is still stored
-- as the player's latest snapshot (history / future use) but does not replace
-- their replayable one.
--
-- Round rules (lib/supabase/ghostRounds.ts GHOST_ROUND_RULES, same table):
--   player EARLY or INVALID      -> opponent point. A player foul always loses:
--                                   EARLY is the existing rule; INVALID keeps the
--                                   V1 meaning of "no valid shot" (opponent point
--                                   whatever the opponent did).
--   else opponent EARLY/INVALID  -> player point (the ghost fouled; it never fires)
--   SHOT vs SHOT                 -> lower normalized ms wins, equal is a draw
--   SHOT vs TIMEOUT              -> shooter wins
--   TIMEOUT vs SHOT              -> opponent
--   TIMEOUT vs TIMEOUT           -> draw
-- A match stops at 2 points; at most 3 rounds.
--
-- Human ghost policy:
--   * written only by the server, only from the player's own completed ranked
--     match that was decided normally (2 points, or all 3 rounds played)
--   * never from a forfeit, never for a bot profile, never merged across matches
--   * legacy profiles.ghost_samples is kept untouched but no longer read.
--     The three remote legacy ghosts are NOT converted: two of them contain a
--     third round recorded after a 2-0 decision (impossible for the real client)
--     and all values are hand-entered-looking multiples of 5/10, so they cannot
--     be proven to be real SHOT/SHOT/SHOT rounds.
--
-- Compatibility:
--   * pvp_matchmake / pvp_submit_match keep their signatures. V1 clients are
--     only matched with all-SHOT snapshots (exactly representable as sample_ms).
--   * V2 clients use pvp_matchmake_v2 / pvp_submit_match_v2 after seeing
--     pvp_capabilities().ghost_snapshot_v2 = true.
--   * 20260927_reconcile_bounty_ranking_v3.sql is not modified; functions it
--     created are replaced here with compatible bodies.
--
-- One transaction; the final contract assertion rolls everything back on failure.

begin;

select set_config('search_path', 'public, extensions', true);

-- ---------------------------------------------------------------------------
-- 1. Validators (pure; used by CHECK constraints and RPC input validation)
-- ---------------------------------------------------------------------------

create or replace function public.pvp_ghost_round_is_valid(r jsonb)
returns boolean language sql immutable
set search_path = public as $$
  select case
    when r is null or jsonb_typeof(r) is distinct from 'object' then false
    when (select count(*) from jsonb_object_keys(r)) <> 2 then false
    when not (r ? 'outcome') or not (r ? 'reaction_ms') then false
    when r->>'outcome' = 'shot' then
      case
        when jsonb_typeof(r->'reaction_ms') is distinct from 'number' then false
        when (r->>'reaction_ms')::numeric <> trunc((r->>'reaction_ms')::numeric) then false
        else (r->>'reaction_ms')::numeric between 80 and 2499
      end
    when r->>'outcome' = 'invalid' then
      case
        when jsonb_typeof(r->'reaction_ms') is distinct from 'number' then false
        when (r->>'reaction_ms')::numeric <> trunc((r->>'reaction_ms')::numeric) then false
        else (r->>'reaction_ms')::numeric between 0 and 79
          or (r->>'reaction_ms')::numeric between 2500 and 10000
      end
    when r->>'outcome' in ('early', 'timeout') then
      jsonb_typeof(r->'reaction_ms') = 'null'
    else false
  end
$$;

-- p_min..p_max valid rounds in a JSON array.
create or replace function public.pvp_ghost_rounds_are_valid(a jsonb, p_min integer, p_max integer)
returns boolean language sql immutable
set search_path = public as $$
  select case
    when a is null or jsonb_typeof(a) is distinct from 'array' then false
    when jsonb_array_length(a) < p_min or jsonb_array_length(a) > p_max then false
    else not exists (
      select 1 from jsonb_array_elements(a) e where not public.pvp_ghost_round_is_valid(e)
    )
  end
$$;

create or replace function public.pvp_ghost_snapshot_is_valid(s jsonb)
returns boolean language sql immutable
set search_path = public as $$
  select case
    when s is null then true
    when jsonb_typeof(s) is distinct from 'object' then false
    when (select count(*) from jsonb_object_keys(s)) <> 4 then false
    when s->'version' is distinct from '2'::jsonb then false
    when jsonb_typeof(s->'source_match_id') is distinct from 'string' then false
    when (s->>'source_match_id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then false
    when jsonb_typeof(s->'recorded_at') is distinct from 'string' then false
    else public.pvp_ghost_rounds_are_valid(s->'rounds', 2, 3)
  end
$$;

-- ---------------------------------------------------------------------------
-- 2. Columns + constraints (nullable, additive)
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists ghost_snapshot jsonb null;
alter table public.profiles drop constraint if exists profile_ghost_snapshot_valid;
alter table public.profiles add constraint profile_ghost_snapshot_valid
  check (public.pvp_ghost_snapshot_is_valid(ghost_snapshot));
alter table public.profiles drop constraint if exists profile_ghost_snapshot_human_only;
alter table public.profiles add constraint profile_ghost_snapshot_human_only
  check (ghost_snapshot is null or is_bot = false);

alter table public.profiles add column if not exists ghost_replay_snapshot jsonb null;
alter table public.profiles drop constraint if exists profile_ghost_replay_snapshot_valid;
alter table public.profiles add constraint profile_ghost_replay_snapshot_valid
  check (ghost_replay_snapshot is null or (
    public.pvp_ghost_snapshot_is_valid(ghost_replay_snapshot)
    and jsonb_array_length(ghost_replay_snapshot->'rounds') = 3
    and is_bot = false));

alter table public.pvp_matches add column if not exists ghost_version smallint not null default 1;
alter table public.pvp_matches add column if not exists opponent_snapshot jsonb null;
alter table public.pvp_matches add column if not exists player_round_detail jsonb null;
alter table public.pvp_matches drop constraint if exists match_ghost_version_valid;
alter table public.pvp_matches add constraint match_ghost_version_valid
  check (ghost_version in (1, 2));
alter table public.pvp_matches drop constraint if exists match_opponent_snapshot_valid;
alter table public.pvp_matches add constraint match_opponent_snapshot_valid
  check (opponent_snapshot is null or (
    public.pvp_ghost_snapshot_is_valid(opponent_snapshot)
    and jsonb_array_length(opponent_snapshot->'rounds') = 3));
alter table public.pvp_matches drop constraint if exists match_opponent_snapshot_human_only;
alter table public.pvp_matches add constraint match_opponent_snapshot_human_only
  check (opponent_snapshot is null or opponent_is_bot = false);
alter table public.pvp_matches drop constraint if exists match_player_round_detail_valid;
alter table public.pvp_matches add constraint match_player_round_detail_valid
  check (player_round_detail is null or public.pvp_ghost_rounds_are_valid(player_round_detail, 1, 3));

-- ---------------------------------------------------------------------------
-- 3. Round model helpers
-- ---------------------------------------------------------------------------

-- Opponent rounds of an assigned match: the copied snapshot, or the stored
-- samples as SHOT rounds (bots, V1 matches). A sample outside 80..2499 never
-- fires before the 2500 ms window closes, so it replays as TIMEOUT.
create or replace function public.pvp_match_opponent_rounds(p_match public.pvp_matches)
returns jsonb language sql stable
set search_path = public as $$
  select coalesce(
    p_match.opponent_snapshot->'rounds',
    (select jsonb_agg(
              case when s between 80 and 2499
                then jsonb_build_object('outcome', 'shot', 'reaction_ms', s)
                else jsonb_build_object('outcome', 'timeout', 'reaction_ms', null)
              end order by ord)
       from unnest(p_match.opponent_samples) with ordinality as u(s, ord))
  )
$$;

-- Server-authoritative scoring. Raises invalid_round_count when rounds are
-- missing (undecided and fewer than 3) or continue after the match is decided.
create or replace function public.pvp_score_rounds_v2(
  p_player jsonb, p_opponent jsonb, out sp integer, out so integer
)
language plpgsql immutable
set search_path = public as $$
declare
  n integer := coalesce(jsonb_array_length(p_player), 0);
  i integer;
  po text;
  oo text;
  pm integer;
  om integer;
begin
  sp := 0;
  so := 0;
  if n < 1 or n > 3 then
    raise exception 'invalid_round_count';
  end if;
  for i in 0 .. n - 1 loop
    if sp >= 2 or so >= 2 then
      raise exception 'invalid_round_count';
    end if;
    po := p_player->i->>'outcome';
    oo := p_opponent->i->>'outcome';
    if po in ('early', 'invalid') then
      so := so + 1;
    elsif oo in ('early', 'invalid') then
      sp := sp + 1;
    elsif po = 'shot' and oo = 'shot' then
      pm := (p_player->i->>'reaction_ms')::integer;
      om := (p_opponent->i->>'reaction_ms')::integer;
      if pm < om then sp := sp + 1; elsif pm > om then so := so + 1; end if;
    elsif po = 'shot' then
      sp := sp + 1;
    elsif oo = 'shot' then
      so := so + 1;
    end if;
  end loop;
  if sp < 2 and so < 2 and n < 3 then
    raise exception 'invalid_round_count';
  end if;
end;
$$;

-- Canonical wire form of submitted rounds (exact keys, integer ms).
create or replace function public.pvp_canonical_rounds(p_rounds jsonb)
returns jsonb language sql immutable
set search_path = public as $$
  select jsonb_agg(
           jsonb_build_object(
             'outcome', e->>'outcome',
             'reaction_ms', case when e->>'outcome' in ('shot', 'invalid')
                                 then to_jsonb((e->>'reaction_ms')::numeric::integer)
                                 else 'null'::jsonb end)
           order by ord)
  from jsonb_array_elements(p_rounds) with ordinality as t(e, ord)
$$;

-- The player's own normally decided match becomes their latest snapshot
-- (2 or 3 played rounds); only a 3-round one also becomes replayable.
create or replace function public.pvp_record_ghost_snapshot(p_match public.pvp_matches, p_rounds jsonb)
returns void language plpgsql
set search_path = public as $$
declare
  n integer := coalesce(jsonb_array_length(p_rounds), 0);
  snap jsonb;
begin
  if p_match.status <> 'complete' or n not in (2, 3) then
    return;
  end if;
  -- 2 rounds are complete only when someone reached 2 points.
  if n = 2 and greatest(p_match.score_player, p_match.score_opponent) < 2 then
    return;
  end if;
  snap := jsonb_build_object(
    'version', 2,
    'source_match_id', p_match.id::text,
    'recorded_at', to_char(p_match.completed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'rounds', p_rounds
  );
  update public.profiles set
    ghost_snapshot = snap,
    ghost_replay_snapshot = case when n = 3 then snap else ghost_replay_snapshot end
  where id = p_match.player_id and is_bot = false;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Matchmaking (human = valid V2 snapshot; otherwise explicit bot)
-- ---------------------------------------------------------------------------

create or replace function public.pvp_assign_match(p_player_id uuid, p_version integer)
returns public.pvp_matches language plpgsql
set search_path = public, extensions as $$
declare
  me public.profiles;
  opp public.profiles;
  match_row public.pvp_matches;
  bot_samples integer[3];
  opp_samples integer[];
  seeded record;
begin
  select * into me from public.profiles where id = p_player_id;

  -- Only 3-round (replayable) snapshots. V1 clients can only replay SHOT
  -- rounds, so they get all-SHOT snapshots only.
  select * into opp from public.profiles
  where id <> me.id and is_bot = false and ghost_replay_snapshot is not null
    and abs(rating - me.rating) <= 300
    and (p_version = 2 or not exists (
      select 1 from jsonb_array_elements(ghost_replay_snapshot->'rounds') r
      where r->>'outcome' <> 'shot'))
  order by abs(rating - me.rating), random() limit 1;

  if opp.id is not null then
    select array_agg((r->>'reaction_ms')::integer order by ord) into opp_samples
    from jsonb_array_elements(opp.ghost_replay_snapshot->'rounds') with ordinality as t(r, ord);
    insert into public.pvp_matches(
      player_id, opponent_id, opponent_name, opponent_character_id,
      opponent_rating, opponent_rank_tier, opponent_is_bot, opponent_samples,
      opponent_snapshot, ghost_version
    ) values (
      me.id, opp.id, opp.display_name, greatest(1, least(4, opp.character_id)),
      opp.rating, opp.rank_tier, false, opp_samples,
      opp.ghost_replay_snapshot, p_version
    ) returning * into match_row;
    return match_row;
  end if;

  -- No eligible human: an explicit bot (seeded bot profile, else generated).
  select * into seeded from public.pvp_pick_seeded_bot(me.rating);
  if found then
    insert into public.pvp_matches(
      player_id, opponent_id, opponent_name, opponent_character_id, opponent_rating,
      opponent_rank_tier, opponent_is_bot, opponent_samples, ghost_version
    ) values (
      me.id, seeded.bot_id, seeded.bot_name, seeded.bot_character, seeded.bot_rating,
      seeded.bot_tier, true, seeded.bot_samples, p_version
    ) returning * into match_row;
  else
    bot_samples := array[
      greatest(120, least(650, 430 - (me.rating - 1000) / 4)),
      greatest(120, least(650, 470 - (me.rating - 1000) / 4)),
      greatest(120, least(650, 450 - (me.rating - 1000) / 4))
    ];
    insert into public.pvp_matches(
      player_id, opponent_name, opponent_character_id, opponent_rating,
      opponent_rank_tier, opponent_is_bot, opponent_samples, ghost_version
    ) values (
      me.id, 'Dust Drifter', 1 + floor(random() * 4)::int, me.rating,
      public.rating_to_rank_tier(me.rating), true, bot_samples, p_version
    ) returning * into match_row;
  end if;
  return match_row;
end;
$$;

create or replace function public.pvp_assignment_json(p_match public.pvp_matches, p_v2 boolean)
returns jsonb language plpgsql volatile
set search_path = public as $$
declare
  opponent jsonb;
begin
  opponent := jsonb_build_object(
    'id', coalesce(p_match.opponent_id, p_match.id),
    'display_name', p_match.opponent_name,
    'character_id', p_match.opponent_character_id,
    'cosmetic_npc_id', null,
    'rating', p_match.opponent_rating,
    'rank_tier', p_match.opponent_rank_tier,
    'is_bot', p_match.opponent_is_bot,
    'sample_ms', to_jsonb(p_match.opponent_samples)
  );
  if p_v2 then
    opponent := opponent || jsonb_build_object('ghost_rounds', public.pvp_match_opponent_rounds(p_match));
  end if;
  return jsonb_build_object(
    'match_id', p_match.id,
    'player', public.pvp_profile_json(p_match.player_id),
    'opponent', opponent
  ) || case when p_v2 then jsonb_build_object('ghost_version', 2) else '{}'::jsonb end;
end;
$$;

-- V1 contract (unchanged signature and response shape).
create or replace function public.pvp_matchmake(p_device_key text)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
begin
  return public.pvp_assignment_json(
    public.pvp_assign_match(public.pvp_resolve_profile(p_device_key, true), 1), false);
end;
$$;

create or replace function public.pvp_matchmake_v2(p_device_key text)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
begin
  return public.pvp_assignment_json(
    public.pvp_assign_match(public.pvp_resolve_profile(p_device_key, true), 2), true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Settlement
-- ---------------------------------------------------------------------------

-- V1 finalize: scoring and Elo as in the baseline, with the valid reaction range
-- aligned to the shared contract (80..2499; 2500 is the end of the window). A V1
-- submission whose played rounds (2 or 3) are all valid shots becomes a
-- SHOT-only snapshot (a V1 null cannot be told apart as EARLY or TIMEOUT, so
-- anything else records nothing). Legacy ghost_samples writes are unchanged.
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
  played integer := 0;
  actual_result text;
  expected numeric;
  delta integer;
  before_rating integer;
  after_rating integer;
  normalized integer[3] := array[null, null, null];
begin
  select * into m from public.pvp_matches where id = p_match_id;

  for i in 1..least(3, coalesce(array_length(p_player_rounds, 1), 0)) loop
    played := played + 1;
    mine := p_player_rounds[i];
    theirs := m.opponent_samples[i];
    normalized[i] := case when mine between 80 and 2499 then mine else null end;
    if normalized[i] is null then
      so := so + 1;
    elsif theirs is null or theirs < 80 or theirs > 2499 then
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
    -- Legacy column, no longer read by matchmaking.
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

  if played in (2, 3)
     and normalized[1] between 80 and 2499 and normalized[2] between 80 and 2499
     and (played = 2 or normalized[3] between 80 and 2499) then
    perform public.pvp_record_ghost_snapshot(m, (
      select jsonb_agg(jsonb_build_object('outcome', 'shot', 'reaction_ms', normalized[k]) order by k)
      from generate_series(1, played) k));
  end if;

  return public.pvp_match_settlement(m, false);
end;
$$;

-- V2 finalize: same Elo formula, rounds scored with the V2 rules.
create or replace function public.pvp_finalize_match_v2(p_match_id uuid, p_rounds jsonb)
returns jsonb language plpgsql
set search_path = public, extensions as $$
declare
  m public.pvp_matches;
  me public.profiles;
  score record;
  actual_result text;
  expected numeric;
  delta integer;
  before_rating integer;
  after_rating integer;
  normalized integer[3] := array[null, null, null];
  i integer;
begin
  select * into m from public.pvp_matches where id = p_match_id;
  select * into score from public.pvp_score_rounds_v2(p_rounds, public.pvp_match_opponent_rounds(m));

  for i in 0 .. jsonb_array_length(p_rounds) - 1 loop
    if p_rounds->i->>'outcome' = 'shot' then
      normalized[i + 1] := (p_rounds->i->>'reaction_ms')::integer;
    end if;
  end loop;

  actual_result := case when score.sp > score.so then 'win' when score.so > score.sp then 'loss' else 'draw' end;
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
    updated_at = now()
  where id = me.id;

  update public.pvp_matches set
    status = 'complete', player_rounds = normalized, player_round_detail = p_rounds,
    score_player = score.sp, score_opponent = score.so, result = actual_result,
    rating_before = before_rating, rating_after = after_rating,
    rating_delta = after_rating - before_rating, completed_at = now()
  where id = m.id
  returning * into m;

  perform public.pvp_record_ghost_snapshot(m, p_rounds);
  return public.pvp_match_settlement(m, false);
end;
$$;

-- V1 submit: same contract. A match whose opponent snapshot has EARLY/TIMEOUT
-- rounds can only be settled by a V2 client (V1 nulls are ambiguous there);
-- the all-no-shot forfeit remains valid for any match.
create or replace function public.pvp_submit_match(
  p_device_key text,
  p_opponent_id uuid,
  p_opponent_is_bot boolean,
  p_player_rounds integer[],
  p_opponent_rounds integer[],
  p_score_player integer,
  p_score_opponent integer,
  p_result text,
  p_character_id integer default 1,
  p_cosmetic_npc_id integer default null
)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
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
  if m.opponent_snapshot is not null
     and exists (select 1 from jsonb_array_elements(m.opponent_snapshot->'rounds') r
                 where r->>'outcome' <> 'shot')
     and exists (select 1 from unnest(coalesce(p_player_rounds, '{}'::integer[])) v where v is not null) then
    raise exception 'match_requires_ghost_v2_client';
  end if;

  settlement := public.pvp_finalize_match(m.id, p_player_rounds);
  update public.profiles
  set character_id = greatest(1, least(4, coalesce(p_character_id, character_id)))
  where id = pid;
  return settlement;
end;
$$;

create or replace function public.pvp_submit_match_v2(
  p_device_key text,
  p_match_id uuid,
  p_rounds jsonb,
  p_character_id integer default null
)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
declare
  pid uuid := public.pvp_resolve_profile(p_device_key, false);
  m public.pvp_matches;
  rounds jsonb;
  settlement jsonb;
begin
  m := public.pvp_lock_match(pid, p_match_id, false);
  if m.id is null then
    raise exception 'match_not_found_or_expired';
  end if;
  -- Idempotent: a settled match always answers with its stored settlement.
  if m.status = 'complete' then
    return public.pvp_match_settlement(m, true);
  end if;
  if m.expires_at <= now() then
    raise exception 'match_not_found_or_expired';
  end if;
  if not public.pvp_ghost_rounds_are_valid(p_rounds, 1, 3) then
    raise exception 'invalid_rounds';
  end if;
  rounds := public.pvp_canonical_rounds(p_rounds);

  settlement := public.pvp_finalize_match_v2(m.id, rounds);
  update public.profiles
  set character_id = greatest(1, least(4, coalesce(p_character_id, character_id)))
  where id = pid;
  return settlement;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5b. Daily / Friend: same reaction contract (valid 80..2499)
--
-- Bodies identical to 20260927 except the valid range upper bound 2500 -> 2499,
-- so a 2500 ms input (end of the window) is invalid in every mode. Signatures,
-- idempotency and recalculation are unchanged.
-- ---------------------------------------------------------------------------

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
      if ms is not null and ms between 80 and 2499 then
        sum_ms := sum_ms + ms;
        valid := valid + 1;
      end if;
      if ms is null or ms < 80 or ms > 2499 then
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

  s1 := greatest(80, least(2499, coalesce(p_sample_ms[1], 280)));
  s2 := greatest(80, least(2499, coalesce(p_sample_ms[2], 280)));
  s3 := greatest(80, least(2499, coalesce(p_sample_ms[3], 280)));

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
        case when p_creator_avg_ms between 80 and 2499 then p_creator_avg_ms end,
        case when p_creator_best_ms between 80 and 2499 then p_creator_best_ms end,
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
      if ms is not null and ms between 80 and 2499 then
        sum_ms := sum_ms + ms;
        valid := valid + 1;
        if best_v is null or ms < best_v then
          best_v := ms;
        end if;
      end if;
      if ms is null or ms < 80 or ms > 2499 then
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
-- 6. History (additive keys) + capabilities
-- ---------------------------------------------------------------------------

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
      score_player, score_opponent, rating_delta, completed_at,
      ghost_version::integer as ghost_version,
      -- Only the rounds actually played (no placeholder for an unplayed round).
      case when player_round_detail is not null
        then to_jsonb(player_rounds[1:jsonb_array_length(player_round_detail)])
        else to_jsonb(player_rounds) end as player_rounds,
      player_round_detail as player_round_detail,
      case when player_round_detail is not null
        then (select jsonb_agg(e order by ord)
              from jsonb_array_elements(public.pvp_match_opponent_rounds(pvp_matches)) with ordinality as t(e, ord)
              where ord <= jsonb_array_length(player_round_detail))
        else public.pvp_match_opponent_rounds(pvp_matches) end as opponent_rounds
    from public.pvp_matches
    where player_id = pid and status = 'complete'
    union all
    select (e->>'id')::uuid, e->>'opponent_name', (e->>'opponent_character_id')::integer,
           e->>'result', (e->>'score_player')::integer, (e->>'score_opponent')::integer,
           (e->>'rating_delta')::integer, (e->>'completed_at')::timestamptz,
           null::integer, null::jsonb, null::jsonb, null::jsonb
    from jsonb_array_elements(public.pvp_legacy_history(pid, limit_count)) e
    order by completed_at desc
    limit greatest(1, least(limit_count, 30))
  ) x;
  return rows;
end;
$$;

create or replace function public.pvp_capabilities()
returns jsonb language sql stable
set search_path = public as $$
  select jsonb_build_object(
    'contract', 'v3-baseline-20260927',
    'ranked_submit_idempotent', true,
    'forfeit_rpc', true,
    'device_key_hash', true,
    'ghost_snapshot_v2', true,
    'history_rounds', true,
    'ghost_contract', 'ghost-v2-final-20260928',
    'ghost_outcomes', jsonb_build_array('shot', 'early', 'timeout', 'invalid'),
    'reaction_valid_ms', jsonb_build_array(80, 2499)
  )
$$;

-- ---------------------------------------------------------------------------
-- 7. Privileges
-- ---------------------------------------------------------------------------

revoke all on function public.pvp_ghost_round_is_valid(jsonb) from public, anon, authenticated;
revoke all on function public.pvp_ghost_rounds_are_valid(jsonb, integer, integer) from public, anon, authenticated;
revoke all on function public.pvp_ghost_snapshot_is_valid(jsonb) from public, anon, authenticated;
revoke all on function public.pvp_match_opponent_rounds(public.pvp_matches) from public, anon, authenticated;
revoke all on function public.pvp_score_rounds_v2(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.pvp_canonical_rounds(jsonb) from public, anon, authenticated;
revoke all on function public.pvp_record_ghost_snapshot(public.pvp_matches, jsonb) from public, anon, authenticated;
revoke all on function public.pvp_assign_match(uuid, integer) from public, anon, authenticated;
revoke all on function public.pvp_assignment_json(public.pvp_matches, boolean) from public, anon, authenticated;
revoke all on function public.pvp_finalize_match(uuid, integer[]) from public, anon, authenticated;
revoke all on function public.pvp_finalize_match_v2(uuid, jsonb) from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.pvp_matchmake(text)',
    'public.pvp_matchmake_v2(text)',
    'public.pvp_submit_match(text,uuid,boolean,integer[],integer[],integer,integer,text,integer,integer)',
    'public.pvp_submit_match_v2(text,uuid,jsonb,integer)',
    'public.pvp_history(text,integer)',
    'public.pvp_capabilities()'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Contract assertion
-- ---------------------------------------------------------------------------

do $$
declare
  problems text[] := array[]::text[];
begin
  if not exists (select 1 from pg_attribute where attrelid = 'public.profiles'::regclass
                 and attname = 'ghost_snapshot' and format_type(atttypid, atttypmod) = 'jsonb') then
    problems := problems || 'profiles.ghost_snapshot jsonb'::text;
  end if;
  if not exists (select 1 from pg_attribute where attrelid = 'public.pvp_matches'::regclass
                 and attname = 'opponent_snapshot' and format_type(atttypid, atttypmod) = 'jsonb') then
    problems := problems || 'pvp_matches.opponent_snapshot jsonb'::text;
  end if;
  if not exists (select 1 from pg_attribute where attrelid = 'public.profiles'::regclass
                 and attname = 'ghost_replay_snapshot' and format_type(atttypid, atttypmod) = 'jsonb') then
    problems := problems || 'profiles.ghost_replay_snapshot jsonb'::text;
  end if;
  if exists (select 1 from public.profiles where is_bot
             and (ghost_snapshot is not null or ghost_replay_snapshot is not null)) then
    problems := problems || 'bot profile holds a ghost snapshot'::text;
  end if;
  if (public.pvp_capabilities()->>'ghost_snapshot_v2')::boolean is not true then
    problems := problems || 'capability ghost_snapshot_v2 missing'::text;
  end if;
  if has_function_privilege('anon', 'public.pvp_finalize_match_v2(uuid,jsonb)', 'EXECUTE')
     or has_function_privilege('anon', 'public.pvp_assign_match(uuid,integer)', 'EXECUTE')
     or has_function_privilege('anon', 'public.pvp_record_ghost_snapshot(public.pvp_matches,jsonb)', 'EXECUTE') then
    problems := problems || 'internal ghost helper is client-executable'::text;
  end if;
  if not has_function_privilege('anon', 'public.pvp_matchmake_v2(text)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.pvp_submit_match_v2(text,uuid,jsonb,integer)', 'EXECUTE') then
    problems := problems || 'V2 client RPCs not executable'::text;
  end if;
  if cardinality(problems) > 0 then
    raise exception 'ghost v2 contract check failed: %', array_to_string(problems, '; ');
  end if;
end;
$$;

commit;
