drop policy if exists "profiles_select_own_or_friend" on public.profiles;

create policy "profiles_select_own_friend_or_pending_request"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.are_friends(auth.uid(), id)
  or exists (
    select 1
    from public.friendships
    where status = 'pending'
      and (
        (requester_id = auth.uid() and addressee_id = profiles.id)
        or (addressee_id = auth.uid() and requester_id = profiles.id)
      )
  )
);
