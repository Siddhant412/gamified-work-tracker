create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null default '',
  avatar_url text,
  timezone text not null default 'UTC',
  tracking_started_on date not null default ((now() at time zone 'UTC')::date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_timezone_not_empty check (length(trim(timezone)) > 0)
);

create table public.daily_application_counts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_date date not null,
  count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, activity_date),
  constraint daily_application_counts_non_negative check (count >= 0)
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_not_self check (requester_id <> addressee_id),
  constraint friendships_status check (status in ('pending', 'accepted', 'declined', 'blocked'))
);

create unique index friendships_unique_pair
on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  notes text not null default '',
  status text not null default 'todo',
  priority text not null default 'medium',
  due_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_not_empty check (length(trim(title)) > 0),
  constraint tasks_status check (status in ('todo', 'doing', 'done')),
  constraint tasks_priority check (priority in ('low', 'medium', 'high'))
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger daily_application_counts_set_updated_at
before update on public.daily_application_counts
for each row execute function public.set_updated_at();

create trigger friendships_set_updated_at
before update on public.friendships
for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.are_friends(left_user_id uuid, right_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friendships
    where status = 'accepted'
      and (
        (requester_id = left_user_id and addressee_id = right_user_id)
        or (requester_id = right_user_id and addressee_id = left_user_id)
      )
  );
$$;

alter table public.profiles enable row level security;
alter table public.daily_application_counts enable row level security;
alter table public.friendships enable row level security;
alter table public.tasks enable row level security;

create policy "profiles_select_own_or_friend"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.are_friends(auth.uid(), id));

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "daily_counts_select_own_or_friend"
on public.daily_application_counts
for select
to authenticated
using (user_id = auth.uid() or public.are_friends(auth.uid(), user_id));

create policy "friendships_select_involved"
on public.friendships
for select
to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "friendships_insert_own_pending"
on public.friendships
for insert
to authenticated
with check (requester_id = auth.uid() and status = 'pending');

create policy "tasks_select_own"
on public.tasks
for select
to authenticated
using (owner_id = auth.uid());

create policy "tasks_insert_own"
on public.tasks
for insert
to authenticated
with check (owner_id = auth.uid());

create policy "tasks_update_own"
on public.tasks
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "tasks_delete_own"
on public.tasks
for delete
to authenticated
using (owner_id = auth.uid());

create or replace function public.adjust_today_application_count(delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_date date;
  next_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select (now() at time zone timezone)::date
  into target_date
  from public.profiles
  where id = auth.uid();

  if target_date is null then
    raise exception 'Profile not found';
  end if;

  insert into public.daily_application_counts (user_id, activity_date, count)
  values (auth.uid(), target_date, greatest(delta, 0))
  on conflict (user_id, activity_date)
  do update set count = public.daily_application_counts.count + excluded.count - greatest(-delta, 0)
  returning count into next_count;

  if next_count < 0 then
    raise exception 'Application count cannot be negative';
  end if;

  return next_count;
end;
$$;

create or replace function public.find_profile_by_email(search_email text)
returns table (
  id uuid,
  email text,
  display_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select profiles.id, profiles.email, profiles.display_name, profiles.avatar_url
  from public.profiles
  where lower(profiles.email) = lower(trim(search_email))
    and profiles.id <> auth.uid()
  limit 1;
$$;

create or replace function public.send_friend_request(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.friendships%rowtype;
  request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Cannot add yourself as a friend';
  end if;

  select *
  into existing
  from public.friendships
  where (requester_id = auth.uid() and addressee_id = target_user_id)
     or (requester_id = target_user_id and addressee_id = auth.uid())
  limit 1;

  if existing.id is not null then
    if existing.status = 'declined' then
      update public.friendships
      set requester_id = auth.uid(),
          addressee_id = target_user_id,
          status = 'pending'
      where id = existing.id
      returning id into request_id;
      return request_id;
    end if;

    return existing.id;
  end if;

  insert into public.friendships (requester_id, addressee_id, status)
  values (auth.uid(), target_user_id, 'pending')
  returning id into request_id;

  return request_id;
end;
$$;

create or replace function public.respond_friend_request(request_id uuid, action text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if action not in ('accepted', 'declined', 'blocked') then
    raise exception 'Invalid friend request action';
  end if;

  update public.friendships
  set status = action
  where id = request_id
    and addressee_id = auth.uid()
    and status = 'pending';

  return found;
end;
$$;

grant execute on function public.adjust_today_application_count(integer) to authenticated;
grant execute on function public.find_profile_by_email(text) to authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_friend_request(uuid, text) to authenticated;
