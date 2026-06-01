import { supabase } from '@/src/lib/supabase';
import type {
  DailyApplicationCount,
  FriendActivity,
  FriendRequest,
  ISODate,
  Profile,
  TaskStatus,
  WorkTask,
} from '@/src/types/domain';

function toProfile(row: {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  timezone: string;
  tracking_started_on: string;
}): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    timezone: row.timezone,
    trackingStartedOn: row.tracking_started_on as Profile['trackingStartedOn'],
  };
}

function toTask(row: {
  id: string;
  title: string;
  notes: string;
  status: string;
  priority: string;
  due_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}): WorkTask {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    status: row.status as TaskStatus,
    priority: row.priority as WorkTask['priority'],
    dueDate: row.due_date as WorkTask['dueDate'],
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchCurrentProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return toProfile(data);
}

export async function updateProfile(
  userId: string,
  patch: Pick<Partial<Profile>, 'displayName' | 'timezone'>,
) {
  const payload = {
    ...(patch.displayName !== undefined ? { display_name: patch.displayName } : {}),
    ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return toProfile(data);
}

export async function fetchApplicationCounts(userId: string, startDate: string, endDate: string) {
  const data = await fetchCountRows({ userIds: [userId], startDate, endDate });

  return data.map(
    (row): DailyApplicationCount => ({
      activityDate: row.activity_date as DailyApplicationCount['activityDate'],
      count: row.count,
    }),
  );
}

export async function adjustTodayApplicationCount(delta: number) {
  const { data, error } = await supabase.rpc('adjust_today_application_count', { delta });
  if (error) throw error;
  return data;
}

export async function setTodayApplicationCount(nextCount: number) {
  const { data, error } = await supabase.rpc('set_today_application_count', {
    next_count: nextCount,
  });
  if (error) throw error;
  return data;
}

export async function fetchTasks(ownerId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('owner_id', ownerId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data.map(toTask);
}

export async function fetchFriendGraph(userId: string, endDate: ISODate) {
  const { data: friendshipRows, error: friendshipError } = await supabase
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('updated_at', { ascending: false });

  if (friendshipError) throw friendshipError;

  const profileIds = Array.from(
    new Set(
      friendshipRows.map((row) => (row.requester_id === userId ? row.addressee_id : row.requester_id)),
    ),
  );

  if (profileIds.length === 0) {
    return { friends: [] as FriendActivity[], friendRequests: [] as FriendRequest[] };
  }

  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', profileIds);

  if (profileError) throw profileError;

  const profileMap = new Map(profileRows.map((row) => [row.id, toProfile(row)]));
  const acceptedFriendIds = friendshipRows
    .filter((row) => row.status === 'accepted')
    .map((row) => (row.requester_id === userId ? row.addressee_id : row.requester_id));

  const countsByUser = new Map<string, DailyApplicationCount[]>();

  if (acceptedFriendIds.length > 0) {
    const countRows = await fetchCountRows({ userIds: acceptedFriendIds, endDate });

    countRows.forEach((row) => {
      const existing = countsByUser.get(row.user_id) ?? [];
      existing.push({
        activityDate: row.activity_date as ISODate,
        count: row.count,
      });
      countsByUser.set(row.user_id, existing);
    });
  }

  const friends: FriendActivity[] = [];
  const friendRequests: FriendRequest[] = [];

  friendshipRows.forEach((row) => {
    const otherUserId = row.requester_id === userId ? row.addressee_id : row.requester_id;
    const profile = profileMap.get(otherUserId);
    if (!profile) return;

    if (row.status === 'accepted') {
      friends.push({
        id: row.id,
        profile,
        counts: countsByUser.get(otherUserId) ?? [],
        acceptedAt: row.updated_at,
      });
    }

    if (row.status === 'pending') {
      friendRequests.push({
        id: row.id,
        direction: row.requester_id === userId ? 'outgoing' : 'incoming',
        profile,
        createdAt: row.created_at,
      });
    }
  });

  return { friends, friendRequests };
}

const countPageSize = 1000;

async function fetchCountRows({
  userIds,
  startDate,
  endDate,
}: {
  userIds: string[];
  startDate?: string;
  endDate: string;
}) {
  const rows: { user_id: string; activity_date: string; count: number }[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from('daily_application_counts')
      .select('user_id,activity_date,count')
      .in('user_id', userIds)
      .lte('activity_date', endDate)
      .order('activity_date', { ascending: true })
      .order('user_id', { ascending: true })
      .range(from, from + countPageSize - 1);

    if (startDate) {
      query = query.gte('activity_date', startDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    rows.push(...data);
    if (data.length < countPageSize) return rows;
    from += countPageSize;
  }
}

export async function upsertTask(ownerId: string, task: Partial<WorkTask> & { title: string }) {
  const payload = {
    id: task.id,
    owner_id: ownerId,
    title: task.title,
    notes: task.notes ?? '',
    status: task.status ?? 'todo',
    priority: task.priority ?? 'medium',
    due_date: task.dueDate ?? null,
    sort_order: task.sortOrder ?? Date.now(),
  };

  const { data, error } = await supabase.from('tasks').upsert(payload).select('*').single();
  if (error) throw error;
  return toTask(data);
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId)
    .select('*')
    .single();

  if (error) throw error;
  return toTask(data);
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

export async function findProfileByEmail(email: string, fallbackDate: ISODate): Promise<Profile | null> {
  const { data, error } = await supabase.rpc('find_profile_by_email', { search_email: email });
  if (error) throw error;

  const result = data[0];
  if (!result) return null;

  return {
    id: result.id,
    email: result.email,
    displayName: result.display_name,
    avatarUrl: result.avatar_url,
    timezone: 'UTC',
    trackingStartedOn: fallbackDate,
  };
}

export async function sendFriendRequest(targetUserId: string) {
  const { data, error } = await supabase.rpc('send_friend_request', { target_user_id: targetUserId });
  if (error) throw error;
  return data;
}

export async function respondFriendRequest(
  requestId: string,
  action: 'accepted' | 'declined' | 'blocked',
) {
  const { data, error } = await supabase.rpc('respond_friend_request', {
    request_id: requestId,
    action,
  });
  if (error) throw error;
  return data;
}

export async function removeFriendship(friendshipId: string) {
  const { data, error } = await supabase.rpc('remove_friendship', {
    target_friendship_id: friendshipId,
  });
  if (error) throw error;
  return data;
}
