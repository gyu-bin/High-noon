create or replace function public.pvp_set_cosmetic_npc(
  p_device_key text,
  p_cosmetic_npc_id integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
$$;

revoke all on function public.pvp_set_cosmetic_npc(text, integer) from public;
grant execute on function public.pvp_set_cosmetic_npc(text, integer) to anon, authenticated;
