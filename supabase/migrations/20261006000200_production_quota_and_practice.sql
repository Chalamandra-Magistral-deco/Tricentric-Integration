-- Production hardening: AI quota + persisted tricentric practice
create table if not exists public.ai_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0 check (request_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.ai_usage_daily enable row level security;

revoke all on public.ai_usage_daily from anon, authenticated;

create or replace function public.consume_ai_quota(
  p_user_id uuid,
  p_limit integer default 20
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null or v_user_id <> p_user_id then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_limit < 1 or p_limit > 100 then
    raise exception 'Invalid quota limit' using errcode = '22023';
  end if;

  insert into public.ai_usage_daily (user_id, usage_date, request_count)
  values (v_user_id, current_date, 1)
  on conflict (user_id, usage_date)
  do update set
    request_count = public.ai_usage_daily.request_count + 1,
    updated_at = now()
  where public.ai_usage_daily.request_count < p_limit
  returning request_count into v_count;

  return v_count is not null and v_count <= p_limit;
end;
$$;

revoke execute on function public.consume_ai_quota(uuid, integer) from public, anon;
grant execute on function public.consume_ai_quota(uuid, integer) to authenticated;

create table if not exists public.tricentric_practices (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  completed_on date not null default current_date,
  head_text text not null default '',
  heart_text text not null default '',
  body_text text not null default '',
  synthesis_text text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, completed_on),
  check (length(head_text) <= 3000),
  check (length(heart_text) <= 3000),
  check (length(body_text) <= 3000),
  check (length(synthesis_text) <= 5000)
);

alter table public.tricentric_practices enable row level security;

create policy "Users can view own tricentric practices"
  on public.tricentric_practices for select
  to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.tricentric_practices from anon, authenticated;

create or replace function public.complete_tricentric_practice(
  p_head text default '',
  p_heart text default '',
  p_body text default '',
  p_synthesis text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_practice_id uuid;
  v_achievement_id uuid;
  v_unlocked boolean := false;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if length(coalesce(p_head, '')) > 3000
     or length(coalesce(p_heart, '')) > 3000
     or length(coalesce(p_body, '')) > 3000
     or length(coalesce(p_synthesis, '')) > 5000 then
    raise exception 'Practice input is too large' using errcode = '22023';
  end if;

  insert into public.user_profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  insert into public.tricentric_practices (
    user_id, head_text, heart_text, body_text, synthesis_text
  )
  values (
    v_user_id,
    trim(coalesce(p_head, '')),
    trim(coalesce(p_heart, '')),
    trim(coalesce(p_body, '')),
    trim(coalesce(p_synthesis, ''))
  )
  returning id into v_practice_id;

  select id into v_achievement_id
  from public.achievements
  where key = 'tricentric_earthquake';

  if v_achievement_id is not null then
    insert into public.user_achievements (user_id, achievement_id)
    values (v_user_id, v_achievement_id)
    on conflict (user_id, achievement_id) do nothing;

    v_unlocked := found;
  end if;

  if v_unlocked then
    update public.user_profiles
    set experience_points = experience_points + 150,
        current_level = case
          when experience_points + 150 >= 5000 then 10
          when experience_points + 150 >= 3750 then 9
          when experience_points + 150 >= 2700 then 8
          when experience_points + 150 >= 1900 then 7
          when experience_points + 150 >= 1300 then 6
          when experience_points + 150 >= 850 then 5
          when experience_points + 150 >= 500 then 4
          when experience_points + 150 >= 250 then 3
          when experience_points + 150 >= 100 then 2
          else 1
        end,
        updated_at = now()
    where id = v_user_id;
  end if;

  return jsonb_build_object(
    'practice_id', v_practice_id,
    'achievement_unlocked', v_unlocked,
    'xp_awarded', case when v_unlocked then 150 else 0 end
  );
end;
$$;

revoke execute on function public.complete_tricentric_practice(text, text, text, text) from public, anon;
grant execute on function public.complete_tricentric_practice(text, text, text, text) to authenticated;
