create or replace function public.set_today_application_count(next_count integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_date date;
  saved_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if next_count < 0 then
    raise exception 'Application count cannot be negative';
  end if;

  select (now() at time zone timezone)::date
  into target_date
  from public.profiles
  where id = auth.uid();

  if target_date is null then
    raise exception 'Profile not found';
  end if;

  insert into public.daily_application_counts (user_id, activity_date, count)
  values (auth.uid(), target_date, next_count)
  on conflict (user_id, activity_date)
  do update set count = excluded.count
  returning count into saved_count;

  return saved_count;
end;
$$;

grant execute on function public.set_today_application_count(integer) to authenticated;
