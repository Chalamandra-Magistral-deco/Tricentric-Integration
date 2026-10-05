-- Persist the tricentric practice instead of using the UI as a non-persistent XP button.

create table if not exists public.tricentric_practices (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  head_text text default '',
  heart_text text default '',
  body_text text default '',
  synthesis_text text default '',
  xp_earned int not null default 0 check (xp_earned >= 0 and xp_earned <= 150),
  completed_at timestamptz not null default now()
);

alter table public.tricentric_practices enable row level security;

drop policy if exists "Users can view own tricentric practices" on public.tricentric_practices;
create policy "Users can view own tricentric practices"
  on public.tricentric_practices for select
  to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists idx_tricentric_practices_user_id
  on public.tricentric_practices(user_id, completed_at desc);

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
  v_achievement_id uuid;
  v_unlocked boolean := false;
  v_xp int := 0;
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

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':tricentric', 0));

  insert into public.user_profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  select id into v_achievement_id
  from public.achievements
  where key = 'tricentric_earthquake';

  insert into public.user_achievements (user_id, achievement_id)
  values (v_user_id, v_achievement_id)
  on conflict (user_id, achievement_id) do nothing;

  v_unlocked := found;
  v_xp := case when v_unlocked then 150 else 0 end;

  insert into public.tricentric_practices (
    user_id, head_text, heart_text, body_text, synthesis_text, xp_earned
  )
  values (
    v_user_id, coalesce(p_head, ''), coalesce(p_heart, ''),
    coalesce(p_body, ''), coalesce(p_synthesis, ''), v_xp
  );

  if v_unlocked then
    update public.user_profiles
    set experience_points = experience_points + v_xp,
        current_level = case
          when experience_points + v_xp >= 5000 then 10
          when experience_points + v_xp >= 3750 then 9
          when experience_points + v_xp >= 2700 then 8
          when experience_points + v_xp >= 1900 then 7
          when experience_points + v_xp >= 1300 then 6
          when experience_points + v_xp >= 850 then 5
          when experience_points + v_xp >= 500 then 4
          when experience_points + v_xp >= 250 then 3
          when experience_points + v_xp >= 100 then 2
          else 1
        end,
        updated_at = now()
    where id = v_user_id;
  end if;

  return jsonb_build_object('unlocked', v_unlocked, 'xp_awarded', v_xp);
end;
$$;

revoke execute on function public.complete_tricentric_practice(text,text,text,text) from public, anon;
grant execute on function public.complete_tricentric_practice(text,text,text,text) to authenticated;
