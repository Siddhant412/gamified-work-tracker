export type ISODate = `${number}-${number}-${number}`;

export type Profile = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  timezone: string;
  trackingStartedOn: ISODate;
};

export type DailyApplicationCount = {
  activityDate: ISODate;
  count: number;
};

export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export type WorkTask = {
  id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: ISODate | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type FriendActivity = {
  id: string;
  profile: Profile;
  counts: DailyApplicationCount[];
  acceptedAt: string;
};

export type FriendRequest = {
  id: string;
  direction: 'incoming' | 'outgoing';
  profile: Profile;
  createdAt: string;
};

export type RangeMonths = 3 | 6 | 12;
