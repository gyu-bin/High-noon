-- High Noon 운영 통계 (익명 device_key 기반)
-- Supabase SQL Editor에서 1회 실행. admin_pin 값은 .env EXPO_PUBLIC_ADMIN_PIN 과 맞출 것.

create table if not exists public.app_settings (
  key text primary key,
  value text not null
);

create table if not exists public.analytics_match_events (
  id bigint generated always as identity primary key,
  device_key_hash text not null,
  app_version text,
  platform text,
  npc_id int not null,
  won boolean not null,
  player_wins int not null,
  npc_wins int not null,
  avg_reaction_ms numeric,
  highest_unlocked int not null,
  created_at timestamptz not null default now()
);

create index if not exists analytics_match_events_created_at_idx
  on public.analytics_match_events (created_at desc);

create index if not exists analytics_match_events_npc_id_idx
  on public.analytics_match_events (npc_id);

alter table public.analytics_match_events enable row level security;
alter table public.app_settings enable row level security;

create or replace function public.analytics_record_match(
  p_device_key text,
  p_app_version text,
  p_platform text,
  p_npc_id int,
  p_won boolean,
  p_player_wins int,
  p_npc_wins int,
  p_avg_reaction_ms numeric,
  p_highest_unlocked int
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
$$;

create or replace function public.admin_get_overview(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
$$;

grant execute on function public.analytics_record_match(
  text, text, text, int, boolean, int, int, numeric, int
) to anon, authenticated;

grant execute on function public.admin_get_overview(text) to anon, authenticated;

-- 최초 1회: 아래 PIN을 본인 값으로 바꿔 실행
-- insert into public.app_settings (key, value) values ('admin_pin', 'your-secret-pin')
-- on conflict (key) do update set value = excluded.value;
