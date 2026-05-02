begin;

select plan(41);

create or replace function pg_temp.try_sql(sql text)
returns text
language plpgsql
as $$
begin
  execute sql;
  return 'ok';
exception when others then
  return SQLSTATE;
end;
$$;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
select
  seed.id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  seed.email,
  crypt('password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', seed.display_name),
  now(),
  now()
from (
  values
    ('00000000-0000-0000-0000-000000000001'::uuid, 'owner@example.com', 'Owner User'),
    ('00000000-0000-0000-0000-000000000002'::uuid, 'friend@example.com', 'Friend User'),
    ('00000000-0000-0000-0000-000000000003'::uuid, 'pending@example.com', 'Pending User'),
    ('00000000-0000-0000-0000-000000000004'::uuid, 'stranger@example.com', 'Stranger User'),
    ('00000000-0000-0000-0000-000000000005'::uuid, 'target@example.com', 'Target User')
) as seed(id, email, display_name);

update public.profiles
set
  timezone = case
    when id = '00000000-0000-0000-0000-000000000001' then 'America/Los_Angeles'
    else 'UTC'
  end,
  tracking_started_on = '2026-04-01'
where id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005'
);

insert into public.friendships (id, requester_id, addressee_id, status)
values
  (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'accepted'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'pending'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005',
    'pending'
  );

insert into public.daily_application_counts (user_id, activity_date, count)
values
  (
    '00000000-0000-0000-0000-000000000001',
    ((now() at time zone 'America/Los_Angeles')::date - 1),
    4
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    ((now() at time zone 'America/Los_Angeles')::date - 1),
    6
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    ((now() at time zone 'America/Los_Angeles')::date - 1),
    7
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    ((now() at time zone 'America/Los_Angeles')::date - 1),
    9
  );

insert into public.tasks (id, owner_id, title, notes, status, priority, sort_order)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Owner private task',
    '',
    'todo',
    'medium',
    1
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'Friend private task',
    '',
    'todo',
    'medium',
    1
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)::integer
    from public.profiles
    where id in (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000004',
      '00000000-0000-0000-0000-000000000005'
    )
  ),
  3,
  'owner can read own, accepted friend, and pending request profiles only'
);

select is(
  (
    select count(distinct user_id)::integer
    from public.daily_application_counts
    where user_id in (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000004'
    )
  ),
  2,
  'owner can read own and accepted friend activity counts only'
);

select is(
  (
    select count(*)::integer
    from public.friendships
    where requester_id = '00000000-0000-0000-0000-000000000001'
       or addressee_id = '00000000-0000-0000-0000-000000000001'
  ),
  2,
  'owner can read friendship rows involving them'
);

select is((select count(*)::integer from public.tasks), 1, 'owner sees only their task rows');

select is(
  pg_temp.try_sql(
    'insert into public.tasks (owner_id, title) values (''00000000-0000-0000-0000-000000000001'', ''Direct own task'')'
  ),
  'ok',
  'owner can directly insert their own task'
);

select ok(
  pg_temp.try_sql(
    'insert into public.tasks (owner_id, title) values (''00000000-0000-0000-0000-000000000002'', ''Cross-user task'')'
  ) <> 'ok',
  'owner cannot directly insert another user task'
);

select ok(
  pg_temp.try_sql(
    'insert into public.daily_application_counts (user_id, activity_date, count) values (''00000000-0000-0000-0000-000000000001'', current_date, 2)'
  ) <> 'ok',
  'direct application count inserts are blocked'
);

select ok(
  pg_temp.try_sql(
    'update public.daily_application_counts set count = 99 where user_id = ''00000000-0000-0000-0000-000000000001'' and activity_date = ((now() at time zone ''America/Los_Angeles'')::date - 1)'
  ) in ('ok', '42501'),
  'direct application count updates are not an editable API'
);

reset role;

select is(
  (
    select count
    from public.daily_application_counts
    where user_id = '00000000-0000-0000-0000-000000000001'
      and activity_date = ((now() at time zone 'America/Los_Angeles')::date - 1)
  ),
  4,
  'previous-day count remains unchanged after direct update attempt'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(public.set_today_application_count(5), 5, 'set_today_application_count saves today');

select is(
  (
    select count
    from public.daily_application_counts
    where user_id = '00000000-0000-0000-0000-000000000001'
      and activity_date = (now() at time zone 'America/Los_Angeles')::date
  ),
  5,
  'set_today_application_count writes the profile-timezone date'
);

select is(public.adjust_today_application_count(3), 8, 'adjust_today_application_count increments today');
select is(public.adjust_today_application_count(-2), 6, 'adjust_today_application_count decrements today');

select ok(
  pg_temp.try_sql('select public.set_today_application_count(-1)') <> 'ok',
  'set_today_application_count rejects negative counts'
);

select ok(
  pg_temp.try_sql('select public.adjust_today_application_count(-999)') <> 'ok',
  'adjust_today_application_count rejects counts below zero'
);

select is(
  (
    select count
    from public.daily_application_counts
    where user_id = '00000000-0000-0000-0000-000000000001'
      and activity_date = (now() at time zone 'America/Los_Angeles')::date
  ),
  6,
  'failed negative adjustment leaves today unchanged'
);

reset role;

select is(
  (
    select count
    from public.daily_application_counts
    where user_id = '00000000-0000-0000-0000-000000000001'
      and activity_date = ((now() at time zone 'America/Los_Angeles')::date - 1)
  ),
  4,
  'today RPCs do not edit the previous local day'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*)::integer from public.find_profile_by_email(' FRIEND@example.com ')),
  1,
  'find_profile_by_email finds an exact normalized email'
);

select is(
  (select count(*)::integer from public.find_profile_by_email('owner@example.com')),
  0,
  'find_profile_by_email does not return the caller'
);

select ok(
  public.send_friend_request('00000000-0000-0000-0000-000000000005') is not null,
  'send_friend_request creates an outgoing pending request'
);

reset role;

select is(
  (
    select status
    from public.friendships
    where requester_id = '00000000-0000-0000-0000-000000000001'
      and addressee_id = '00000000-0000-0000-0000-000000000005'
  )::text,
  'pending',
  'outgoing friend request is persisted as pending'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)::integer
    from public.profiles
    where id = '00000000-0000-0000-0000-000000000005'
  ),
  1,
  'pending outgoing request profile remains readable after reload'
);

select ok(
  pg_temp.try_sql('select public.send_friend_request(''00000000-0000-0000-0000-000000000001'')') <> 'ok',
  'send_friend_request rejects self requests'
);

select is(
  public.respond_friend_request('20000000-0000-0000-0000-000000000002', 'accepted'),
  true,
  'respond_friend_request lets the addressee accept an incoming request'
);

reset role;

select is(
  (select status from public.friendships where id = '20000000-0000-0000-0000-000000000002')::text,
  'accepted',
  'accepted friend request is persisted'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(distinct user_id)::integer
    from public.daily_application_counts
    where user_id in (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000004'
    )
  ),
  3,
  'newly accepted friend activity becomes readable'
);

select is(
  public.respond_friend_request('20000000-0000-0000-0000-000000000003', 'accepted'),
  false,
  'non-addressee cannot respond to someone else request'
);

reset role;

select is(
  (select status from public.friendships where id = '20000000-0000-0000-0000-000000000003')::text,
  'pending',
  'non-addressee response leaves request unchanged'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select ok(
  pg_temp.try_sql(
    'insert into public.friendships (requester_id, addressee_id, status) values (''00000000-0000-0000-0000-000000000002'', ''00000000-0000-0000-0000-000000000004'', ''pending'')'
  ) <> 'ok',
  'direct friendship insert cannot forge requester identity'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)::integer
    from public.profiles
    where id in (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000004',
      '00000000-0000-0000-0000-000000000005'
    )
  ),
  2,
  'stranger can read own and pending counterpart profiles only'
);

select is(
  (
    select count(distinct user_id)::integer
    from public.daily_application_counts
    where user_id in (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000004'
    )
  ),
  1,
  'stranger can read only their own application activity'
);

select is((select count(*)::integer from public.tasks), 0, 'stranger cannot read other users tasks');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is((select count(*)::integer from public.tasks), 1, 'accepted friend cannot read owner tasks');

select is(
  (
    select count(distinct user_id)::integer
    from public.daily_application_counts
    where user_id in (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
  ),
  2,
  'accepted friend can read owner application activity'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  public.remove_friendship('20000000-0000-0000-0000-000000000001'),
  false,
  'non-participant cannot remove someone else friendship'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  public.remove_friendship('20000000-0000-0000-0000-000000000001'),
  true,
  'accepted friend can remove friendship'
);

select is(
  public.remove_friendship('20000000-0000-0000-0000-000000000001'),
  false,
  'remove_friendship is idempotent after removal'
);

select is(
  (
    select count(*)::integer
    from public.friendships
    where id = '20000000-0000-0000-0000-000000000001'
  ),
  0,
  'removed friendship row is deleted'
);

select is(
  (
    select count(distinct user_id)::integer
    from public.daily_application_counts
    where user_id in (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
  ),
  1,
  'former friend can no longer read owner application activity'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (
    select count(*)::integer
    from public.profiles
    where id in (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
  ),
  1,
  'owner can no longer read removed friend profile'
);

select is(
  (
    select count(distinct user_id)::integer
    from public.daily_application_counts
    where user_id in (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
  ),
  1,
  'owner can no longer read removed friend activity'
);

reset role;

select * from finish();

rollback;
