create table public.task_daily_completions (
  task_id uuid not null references public.tasks(id) on delete cascade,
  activity_date date not null,
  completed_at timestamptz not null default now(),
  primary key (task_id, activity_date)
);

alter table public.task_daily_completions enable row level security;

create policy "task_completions_select_own"
on public.task_daily_completions
for select
to authenticated
using (
  exists (
    select 1
    from public.tasks
    where tasks.id = task_daily_completions.task_id
      and tasks.owner_id = auth.uid()
  )
);

create or replace function public.set_today_task_completion(target_task_id uuid, completed boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_date date;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if completed is null then
    raise exception 'Completion value is required';
  end if;

  select (now() at time zone profiles.timezone)::date
  into target_date
  from public.tasks
  join public.profiles on profiles.id = tasks.owner_id
  where tasks.id = target_task_id
    and tasks.owner_id = auth.uid();

  if target_date is null then
    raise exception 'Task not found';
  end if;

  if completed then
    insert into public.task_daily_completions (task_id, activity_date)
    values (target_task_id, target_date)
    on conflict (task_id, activity_date)
    do update set completed_at = now();
  else
    delete from public.task_daily_completions
    where task_id = target_task_id
      and activity_date = target_date;
  end if;

  return completed;
end;
$$;

revoke execute on function public.set_today_task_completion(uuid, boolean) from public, anon;
grant execute on function public.set_today_task_completion(uuid, boolean) to authenticated;
