-- Production hardening: server-authoritative evaluation flow
-- Prevents client-side XP/streak/achievement manipulation and duplicate daily rewards.

drop policy if exists "Users can update own profile" on public.user_profiles;
drop policy if exists "Users can insert own profile" on public.user_profiles;
drop policy if exists "Users can insert own evaluations" on public.evaluations;
drop policy if exists "Users can insert own achievements" on public.user_achievements;

create or replace function public.ensure_user_profile()
returns public.user_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.user_profiles;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  insert into public.user_profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  select * into v_profile
  from public.user_profiles
  where id = v_user_id;

  return v_profile;
end;
$$;

revoke execute on function public.ensure_user_profile() from public, anon;
grant execute on function public.ensure_user_profile() to authenticated;

create or replace function public.complete_evaluation(
  p_bleeding_center text,
  p_sacrifice_center text,
  p_oxygen_actions text[] default '{}',
  p_synthesis_text text default '',
  p_ai_analysis text default '',
  p_ai_synthesis_feedback text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.user_profiles;
  v_today date := current_date;
  v_streak int;
  v_is_honest boolean;
  v_base_xp int := 50;
  v_streak_xp int;
  v_honest_xp int;
  v_xp_gained int;
  v_new_xp int;
  v_new_total int;
  v_new_level int;
  v_eval_id uuid;
  v_achievement record;
  v_achievement_xp int := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_bleeding_center not in ('head','heart','body')
     or p_sacrifice_center not in ('head','heart','body') then
    raise exception 'Invalid center selection' using errcode = '22023';
  end if;

  if length(coalesce(p_synthesis_text, '')) < 1
     or length(p_synthesis_text) > 5000 then
    raise exception 'Synthesis must contain 1 to 5000 characters' using errcode = '22023';
  end if;

  if coalesce(length(p_ai_analysis), 0) > 10000
     or coalesce(length(p_ai_synthesis_feedback), 0) > 10000 then
    raise exception 'AI response is too large' using errcode = '22023';
  end if;

  -- Serialize completions for this user so two simultaneous requests cannot both earn a daily reward.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  insert into public.user_profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  select * into v_profile
  from public.user_profiles
  where id = v_user_id
  for update;

  if v_profile.last_evaluation_date = v_today then
    raise exception 'Daily evaluation already completed' using errcode = '23505';
  end if;

  if v_profile.last_evaluation_date = v_today - 1 then
    v_streak := coalesce(v_profile.streak_days, 0) + 1;
  else
    v_streak := 1;
  end if;

  v_is_honest := length(trim(p_synthesis_text)) >= 50
    and coalesce(length(trim(p_ai_synthesis_feedback)), 0) > 0;

  v_streak_xp := v_streak * 10;
  v_honest_xp := case when v_is_honest then 50 else 0 end;
  v_xp_gained := v_base_xp + v_streak_xp + v_honest_xp;
  v_new_xp := coalesce(v_profile.experience_points, 0) + v_xp_gained;
  v_new_total := coalesce(v_profile.total_evaluations, 0) + 1;

  v_new_level := case
    when v_new_xp >= 5000 then 10
    when v_new_xp >= 3750 then 9
    when v_new_xp >= 2700 then 8
    when v_new_xp >= 1900 then 7
    when v_new_xp >= 1300 then 6
    when v_new_xp >= 850 then 5
    when v_new_xp >= 500 then 4
    when v_new_xp >= 250 then 3
    when v_new_xp >= 100 then 2
    else 1
  end;

  insert into public.evaluations (
    user_id, bleeding_center, sacrifice_center, oxygen_actions,
    synthesis_text, ai_analysis, ai_synthesis_feedback, xp_earned
  )
  values (
    v_user_id, p_bleeding_center, p_sacrifice_center, coalesce(p_oxygen_actions, '{}'),
    p_synthesis_text, coalesce(p_ai_analysis, ''), p_ai_synthesis_feedback, v_xp_gained
  )
  returning id into v_eval_id;

  update public.user_profiles
  set experience_points = v_new_xp,
      current_level = v_new_level,
      total_evaluations = v_new_total,
      streak_days = v_streak,
      last_evaluation_date = v_today,
      updated_at = now()
  where id = v_user_id;

  -- Each achievement is inserted once; its XP reward is awarded only on the first unlock.
  for v_achievement in
    select id, key, xp_reward
    from public.achievements
    where key in (
      'first_blood',
      'week_warrior',
      'month_survivor',
      'level_5',
      'level_10',
      'ten_evaluations',
      'honest_synthesis'
    )
  loop
    if (v_achievement.key = 'first_blood' and v_new_total = 1)
       or (v_achievement.key = 'week_warrior' and v_streak >= 7)
       or (v_achievement.key = 'month_survivor' and v_streak >= 30)
       or (v_achievement.key = 'level_5' and v_new_level >= 5)
       or (v_achievement.key = 'level_10' and v_new_level >= 10)
       or (v_achievement.key = 'ten_evaluations' and v_new_total >= 10)
       or (v_achievement.key = 'honest_synthesis' and v_is_honest) then

      insert into public.user_achievements (user_id, achievement_id)
      values (v_user_id, v_achievement.id)
      on conflict (user_id, achievement_id) do nothing;

      if found then
        v_achievement_xp := v_achievement_xp + coalesce(v_achievement.xp_reward, 0);
      end if;
    end if;
  end loop;

  if v_achievement_xp > 0 then
    v_new_xp := v_new_xp + v_achievement_xp;

    v_new_level := case
      when v_new_xp >= 5000 then 10
      when v_new_xp >= 3750 then 9
      when v_new_xp >= 2700 then 8
      when v_new_xp >= 1900 then 7
      when v_new_xp >= 1300 then 6
      when v_new_xp >= 850 then 5
      when v_new_xp >= 500 then 4
      when v_new_xp >= 250 then 3
      when v_new_xp >= 100 then 2
      else 1
    end;

    update public.user_profiles
    set experience_points = v_new_xp,
        current_level = v_new_level,
        updated_at = now()
    where id = v_user_id;
  end if;

  return jsonb_build_object(
    'evaluation_id', v_eval_id,
    'xp_earned', v_xp_gained + v_achievement_xp,
    'experience_points', v_new_xp,
    'current_level', v_new_level,
    'streak_days', v_streak,
    'total_evaluations', v_new_total,
    'achievement_xp', v_achievement_xp
  );
end;
$$;

revoke execute on function public.complete_evaluation(text,text,text[],text,text,text) from public, anon;
grant execute on function public.complete_evaluation(text,text,text[],text,text,text) to authenticated;

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

  select id into v_achievement_id
  from public.achievements
  where key = 'tricentric_earthquake';

  insert into public.user_achievements (user_id, achievement_id)
  values (v_user_id, v_achievement_id)
  on conflict (user_id, achievement_id) do nothing;

  v_unlocked := found;

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
    'unlocked', v_unlocked,
    'xp_awarded', case when v_unlocked then 150 else 0 end
  );
end;
$$;

revoke execute on function public.complete_tricentric_practice(text,text,text,text) from public, anon;
grant execute on function public.complete_tricentric_practice(text,text,text,text) to authenticated;

-- Legacy functions remain only for backwards compatibility during rollout, but are no longer executable by clients.
revoke execute on function public.increment_xp(uuid, integer) from public, anon, authenticated;
revoke execute on function public.tricentric_earthquake(uuid) from public, anon, authenticated;
