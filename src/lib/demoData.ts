import type {
  DailyApplicationCount,
  FriendActivity,
  FriendRequest,
  ISODate,
  Profile,
  TaskDailyCompletion,
  WorkTask,
} from '@/src/types/domain';

import { addDays, getDeviceTimezone, subtractMonths } from './dates';

export function createDemoProfile(): Profile {
  return {
    id: 'local-user',
    email: 'you@example.com',
    displayName: 'You',
    avatarUrl: null,
    timezone: getDeviceTimezone(),
    trackingStartedOn: subtractMonths(new Date().toISOString().slice(0, 10) as ISODate, 4),
  };
}

export function createDemoCounts(today: ISODate): DailyApplicationCount[] {
  const start = subtractMonths(today, 4);
  const counts: DailyApplicationCount[] = [];
  let cursor = start;
  let index = 0;

  while (cursor <= today) {
    const wave = (index * 17 + 9) % 13;
    const isWeekend = [0, 6].includes(new Date(`${cursor}T12:00:00Z`).getUTCDay());
    const count = wave > 8 ? wave - 6 : wave > 5 && !isWeekend ? 2 : wave === 3 ? 1 : 0;

    if (count > 0) {
      counts.push({ activityDate: cursor, count });
    }

    cursor = addDays(cursor, 1);
    index += 1;
  }

  return counts;
}

export function createDemoTasks(): WorkTask[] {
  const now = new Date().toISOString();

  return [
    {
      id: 'task-1',
      title: 'Refine resume for platform roles',
      notes: 'Trim older bullets and make impact metrics easier to scan.',
      status: 'doing',
      priority: 'high',
      dueDate: null,
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'task-2',
      title: 'Apply to 8 curated roles',
      notes: 'Prioritize companies with recent backend or full-stack postings.',
      status: 'todo',
      priority: 'high',
      dueDate: null,
      sortOrder: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'task-3',
      title: 'Follow up with recruiter from last week',
      notes: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      sortOrder: 3,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'task-4',
      title: 'Update portfolio project summary',
      notes: 'Add deployment link and clearer product screenshots.',
      status: 'done',
      priority: 'low',
      dueDate: null,
      sortOrder: 4,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function createDemoTaskCompletions(today: ISODate): TaskDailyCompletion[] {
  const tasks = createDemoTasks();
  const start = subtractMonths(today, 3);
  const completions: TaskDailyCompletion[] = [];
  let cursor = start;
  let index = 0;

  while (cursor <= today) {
    tasks.forEach((task, taskIndex) => {
      const cadence = taskIndex + 2;
      if ((index + taskIndex) % cadence !== 0 && (index * 3 + taskIndex) % 11 !== 0) {
        completions.push({ taskId: task.id, activityDate: cursor });
      }
    });

    cursor = addDays(cursor, 1);
    index += 1;
  }

  return completions;
}

export function createDemoFriends(today: ISODate): FriendActivity[] {
  const base = createDemoCounts(today);

  return [
    {
      id: 'friend-1',
      acceptedAt: new Date().toISOString(),
      profile: {
        id: 'friend-1',
        email: 'maya@example.com',
        displayName: 'Maya Chen',
        avatarUrl: null,
        timezone: getDeviceTimezone(),
        trackingStartedOn: subtractMonths(today, 3),
      },
      counts: base
        .filter((_, index) => index % 3 !== 0)
        .map((item, index) => ({ ...item, count: Math.max(0, item.count + (index % 2)) })),
    },
    {
      id: 'friend-2',
      acceptedAt: new Date().toISOString(),
      profile: {
        id: 'friend-2',
        email: 'arjun@example.com',
        displayName: 'Arjun Patel',
        avatarUrl: null,
        timezone: getDeviceTimezone(),
        trackingStartedOn: subtractMonths(today, 2),
      },
      counts: base
        .filter((_, index) => index % 4 !== 0)
        .map((item) => ({ ...item, count: Math.max(1, Math.round(item.count * 0.8)) })),
    },
  ];
}

export function createDemoRequests(): FriendRequest[] {
  return [
    {
      id: 'request-1',
      direction: 'incoming',
      createdAt: new Date().toISOString(),
      profile: {
        id: 'friend-request-1',
        email: 'sam@example.com',
        displayName: 'Sam Rivera',
        avatarUrl: null,
        timezone: getDeviceTimezone(),
        trackingStartedOn: new Date().toISOString().slice(0, 10) as ISODate,
      },
    },
  ];
}
