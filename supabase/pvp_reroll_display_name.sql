-- 서부 결투 가명. 유저 입력은 받지 않는다.
-- 실 스키마: profiles.display_name + device_identities.device_key
-- 겹치면 다른 조합 → 로마숫자 순으로 비운다.

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
$$;

create or replace function public.pvp_login_device(p_device_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
$$;

create or replace function public.pvp_reroll_display_name(p_device_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
$$;

revoke all on function public.pvp_pick_western_alias(uuid, text) from public, anon, authenticated;
revoke all on function public.pvp_reroll_display_name(text) from public;
grant execute on function public.pvp_reroll_display_name(text) to anon, authenticated;
grant execute on function public.pvp_login_device(text) to anon, authenticated;

do $$
begin
  create unique index if not exists profiles_display_name_uidx
    on public.profiles (display_name);
exception
  when duplicate_table then null;
  when unique_violation then null;
end;
$$;
