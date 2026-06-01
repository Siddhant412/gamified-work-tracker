revoke execute on function public.adjust_today_application_count(integer) from public, anon;
revoke execute on function public.set_today_application_count(integer) from public, anon;
revoke execute on function public.find_profile_by_email(text) from public, anon;
revoke execute on function public.send_friend_request(uuid) from public, anon;
revoke execute on function public.respond_friend_request(uuid, text) from public, anon;
revoke execute on function public.remove_friendship(uuid) from public, anon;

grant execute on function public.adjust_today_application_count(integer) to authenticated;
grant execute on function public.set_today_application_count(integer) to authenticated;
grant execute on function public.find_profile_by_email(text) to authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_friend_request(uuid, text) to authenticated;
grant execute on function public.remove_friendship(uuid) to authenticated;
