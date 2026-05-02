create or replace function public.remove_friendship(target_friendship_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  delete from public.friendships
  where id = target_friendship_id
    and status = 'accepted'
    and (requester_id = auth.uid() or addressee_id = auth.uid());

  return found;
end;
$$;

grant execute on function public.remove_friendship(uuid) to authenticated;
