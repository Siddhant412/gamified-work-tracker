import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  createDemoCounts,
  createDemoFriends,
  createDemoProfile,
  createDemoRequests,
  createDemoTasks,
} from '@/src/lib/demoData';
import { subtractMonths, toLocalDateKey } from '@/src/lib/dates';
import { isSupabaseConfigured } from '@/src/config/env';
import {
  adjustTodayApplicationCount as remoteAdjustTodayApplicationCount,
  deleteTask as remoteDeleteTask,
  fetchApplicationCounts,
  fetchCurrentProfile,
  fetchFriendGraph,
  fetchTasks,
  findProfileByEmail as remoteFindProfileByEmail,
  respondFriendRequest as remoteRespondFriendRequest,
  sendFriendRequest as remoteSendFriendRequest,
  updateTaskStatus as remoteUpdateTaskStatus,
  upsertTask as remoteUpsertTask,
} from '@/src/services/supabaseService';
import type {
  DailyApplicationCount,
  FriendActivity,
  FriendRequest,
  ISODate,
  Profile,
  RangeMonths,
  TaskPriority,
  TaskStatus,
  WorkTask,
} from '@/src/types/domain';

import { useAuth } from './AuthProvider';

const storageKey = 'applyloop.local-state.v1';

type PersistedState = {
  profile: Profile;
  counts: DailyApplicationCount[];
  tasks: WorkTask[];
  friends: FriendActivity[];
  friendRequests: FriendRequest[];
};

type AppDataState = PersistedState & {
  isLoading: boolean;
  rangeMonths: RangeMonths;
  today: ISODate;
  setRangeMonths: (months: RangeMonths) => void;
  adjustTodayCount: (delta: number) => void;
  createTask: (input: {
    title: string;
    notes?: string;
    priority?: TaskPriority;
    dueDate?: ISODate | null;
  }) => void;
  updateTask: (taskId: string, patch: Partial<WorkTask>) => void;
  moveTask: (taskId: string, status: TaskStatus) => void;
  deleteTask: (taskId: string) => void;
  searchFriendByEmail: (email: string) => Promise<Profile | null>;
  sendFriendRequest: (profile: Profile) => void;
  respondToFriendRequest: (requestId: string, action: 'accepted' | 'declined') => void;
};

const AppDataContext = createContext<AppDataState | null>(null);

function initialState(): PersistedState {
  const profile = createDemoProfile();
  const today = toLocalDateKey(new Date(), profile.timezone);

  return {
    profile,
    counts: createDemoCounts(today),
    tasks: createDemoTasks(),
    friends: createDemoFriends(today),
    friendRequests: createDemoRequests(),
  };
}

async function loadRemoteState(userId: string): Promise<PersistedState> {
  const profile = await fetchCurrentProfile(userId);
  const today = toLocalDateKey(new Date(), profile.timezone);
  const startDate = subtractMonths(today, 12);
  const [counts, tasks, friendGraph] = await Promise.all([
    fetchApplicationCounts(userId, startDate, today),
    fetchTasks(userId),
    fetchFriendGraph(userId, startDate, today),
  ]);

  return {
    profile,
    counts,
    tasks,
    friends: friendGraph.friends,
    friendRequests: friendGraph.friendRequests,
  };
}

export function AppDataProvider({ children }: PropsWithChildren) {
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [rangeMonths, setRangeMonths] = useState<RangeMonths>(6);
  const [state, setState] = useState<PersistedState>(() => initialState());
  const isRemoteMode = Boolean(isSupabaseConfigured && auth.userId && auth.userId !== 'local-user');

  const refreshRemoteState = useCallback(async () => {
    if (!auth.userId || !isRemoteMode) return;
    setState(await loadRemoteState(auth.userId));
  }, [auth.userId, isRemoteMode]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!auth.isSignedIn) {
        setIsLoading(false);
        return;
      }

      if (isRemoteMode && auth.userId) {
        const remoteState = await loadRemoteState(auth.userId);
        if (!isMounted) return;
        setState(remoteState);
        setIsLoading(false);
        return;
      }

      const raw = await AsyncStorage.getItem(storageKey);
      if (!isMounted) return;

      if (raw) {
        setState(JSON.parse(raw) as PersistedState);
      } else {
        setState(initialState());
      }

      setIsLoading(false);
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [auth.isSignedIn, auth.userId, isRemoteMode]);

  useEffect(() => {
    if (!isLoading && auth.isSignedIn && !isRemoteMode) {
      AsyncStorage.setItem(storageKey, JSON.stringify(state));
    }
  }, [auth.isSignedIn, isLoading, isRemoteMode, state]);

  const today = toLocalDateKey(new Date(), state.profile.timezone);

  const adjustTodayCount = useCallback(
    (delta: number) => {
      const applyCount = (nextCount?: number) => {
        setState((current) => {
          const existing = current.counts.find((item) => item.activityDate === today);
          const calculatedCount = Math.max(0, nextCount ?? (existing?.count ?? 0) + delta);
          const withoutToday = current.counts.filter((item) => item.activityDate !== today);

          return {
            ...current,
            counts: [...withoutToday, { activityDate: today, count: calculatedCount }].sort((a, b) =>
              a.activityDate.localeCompare(b.activityDate),
            ),
          };
        });
      };

      applyCount();

      if (isRemoteMode) {
        remoteAdjustTodayApplicationCount(delta)
          .then((nextCount) => applyCount(nextCount))
          .catch(() => refreshRemoteState());
      }
    },
    [isRemoteMode, refreshRemoteState, today],
  );

  const createTask = useCallback<AppDataState['createTask']>(
    (input) => {
      const now = new Date().toISOString();
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `task-${Date.now()}`;
      const task: WorkTask = {
        id,
        title: input.title.trim(),
        notes: input.notes?.trim() ?? '',
        status: 'todo',
        priority: input.priority ?? 'medium',
        dueDate: input.dueDate ?? null,
        sortOrder: Date.now(),
        createdAt: now,
        updatedAt: now,
      };

      setState((current) => {
        return {
          ...current,
          tasks: [task, ...current.tasks],
        };
      });

      if (isRemoteMode && auth.userId) {
        remoteUpsertTask(auth.userId, task)
          .then((savedTask) => {
            setState((current) => ({
              ...current,
              tasks: current.tasks.map((item) => (item.id === task.id ? savedTask : item)),
            }));
          })
          .catch(() => refreshRemoteState());
      }
    },
    [auth.userId, isRemoteMode, refreshRemoteState],
  );

  const updateTask = useCallback<AppDataState['updateTask']>((taskId, patch) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === taskId ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task,
      ),
    }));
  }, []);

  const moveTask = useCallback<AppDataState['moveTask']>(
    (taskId, status) => {
      updateTask(taskId, { status });

      if (isRemoteMode) {
        remoteUpdateTaskStatus(taskId, status).catch(() => refreshRemoteState());
      }
    },
    [isRemoteMode, refreshRemoteState, updateTask],
  );

  const deleteTask = useCallback<AppDataState['deleteTask']>((taskId) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId),
    }));

    if (isRemoteMode) {
      remoteDeleteTask(taskId).catch(() => refreshRemoteState());
    }
  }, [isRemoteMode, refreshRemoteState]);

  const searchFriendByEmail = useCallback<AppDataState['searchFriendByEmail']>(
    async (email) => {
      const normalized = email.trim().toLowerCase();
      const existing = state.friends.find((friend) => friend.profile.email === normalized);
      if (existing) return existing.profile;

      const request = state.friendRequests.find((item) => item.profile.email === normalized);
      if (request) return request.profile;

      if (isRemoteMode) {
        return remoteFindProfileByEmail(normalized, today);
      }

      if (normalized.endsWith('@example.com') && normalized !== state.profile.email) {
        return {
          id: `search-${normalized}`,
          email: normalized,
          displayName: normalized
            .split('@')[0]
            .split(/[._-]/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' '),
          avatarUrl: null,
          timezone: state.profile.timezone,
          trackingStartedOn: today,
        };
      }

      return null;
    },
    [
      isRemoteMode,
      state.friendRequests,
      state.friends,
      state.profile.email,
      state.profile.timezone,
      today,
    ],
  );

  const sendFriendRequest = useCallback<AppDataState['sendFriendRequest']>(
    (profile) => {
      const request: FriendRequest = {
        id: `request-${Date.now()}`,
        direction: 'outgoing',
        profile,
        createdAt: new Date().toISOString(),
      };

      setState((current) => ({
        ...current,
        friendRequests: [
          request,
          ...current.friendRequests.filter((item) => item.profile.id !== profile.id),
        ],
      }));

      if (isRemoteMode) {
        remoteSendFriendRequest(profile.id)
          .then(() => refreshRemoteState())
          .catch(() => refreshRemoteState());
      }
    },
    [isRemoteMode, refreshRemoteState],
  );

  const respondToFriendRequest = useCallback<AppDataState['respondToFriendRequest']>(
    (requestId, action) => {
      setState((current) => {
        const request = current.friendRequests.find((item) => item.id === requestId);
        if (!request) return current;

        const remaining = current.friendRequests.filter((item) => item.id !== requestId);

        if (action === 'declined') {
          return { ...current, friendRequests: remaining };
        }

        return {
          ...current,
          friendRequests: remaining,
          friends: [
            {
              id: request.profile.id,
              profile: request.profile,
              counts: createDemoCounts(today),
              acceptedAt: new Date().toISOString(),
            },
            ...current.friends,
          ],
        };
      });

      if (isRemoteMode) {
        remoteRespondFriendRequest(requestId, action)
          .then(() => refreshRemoteState())
          .catch(() => refreshRemoteState());
      }
    },
    [isRemoteMode, refreshRemoteState, today],
  );

  const value = useMemo<AppDataState>(
    () => ({
      ...state,
      isLoading,
      rangeMonths,
      today,
      setRangeMonths,
      adjustTodayCount,
      createTask,
      updateTask,
      moveTask,
      deleteTask,
      searchFriendByEmail,
      sendFriendRequest,
      respondToFriendRequest,
    }),
    [
      adjustTodayCount,
      createTask,
      deleteTask,
      isLoading,
      moveTask,
      rangeMonths,
      respondToFriendRequest,
      searchFriendByEmail,
      sendFriendRequest,
      state,
      today,
      updateTask,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used within AppDataProvider');
  return context;
}
