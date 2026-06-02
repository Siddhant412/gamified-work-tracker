import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  createDemoCounts,
  createDemoFriends,
  createDemoProfile,
  createDemoRequests,
  createDemoTaskCompletions,
  createDemoTasks,
} from '@/src/lib/demoData';
import { toLocalDateKey } from '@/src/lib/dates';
import { isSupabaseConfigured } from '@/src/config/env';
import {
  adjustTodayApplicationCount as remoteAdjustTodayApplicationCount,
  deleteTask as remoteDeleteTask,
  fetchApplicationCounts,
  fetchCurrentProfile,
  fetchFriendGraph,
  fetchTaskCompletions,
  fetchTasks,
  findProfileByEmail as remoteFindProfileByEmail,
  removeFriendship as remoteRemoveFriendship,
  respondFriendRequest as remoteRespondFriendRequest,
  sendFriendRequest as remoteSendFriendRequest,
  setTodayApplicationCount as remoteSetTodayApplicationCount,
  setTodayTaskCompletion as remoteSetTodayTaskCompletion,
  updateProfile as remoteUpdateProfile,
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
  TaskDailyCompletion,
  TaskStatus,
  WorkTask,
} from '@/src/types/domain';

import { useAuth } from './AuthProvider';

const storageKey = 'applyloop.local-state.v1';

type PersistedState = {
  profile: Profile;
  counts: DailyApplicationCount[];
  tasks: WorkTask[];
  taskCompletions: TaskDailyCompletion[];
  friends: FriendActivity[];
  friendRequests: FriendRequest[];
};

type DataNotice = {
  kind: 'success' | 'error';
  message: string;
};

type AppDataState = PersistedState & {
  isLoading: boolean;
  notice: DataNotice | null;
  rangeMonths: RangeMonths;
  today: ISODate;
  clearNotice: () => void;
  updateProfile: (patch: Pick<Partial<Profile>, 'displayName' | 'timezone'>) => Promise<void>;
  setRangeMonths: (months: RangeMonths) => void;
  adjustTodayCount: (delta: number) => void;
  setTodayCount: (count: number) => void;
  createTask: (input: {
    title: string;
    notes?: string;
    priority?: TaskPriority;
    dueDate?: ISODate | null;
  }) => void;
  updateTask: (taskId: string, patch: Partial<WorkTask>) => void;
  moveTask: (taskId: string, status: TaskStatus, beforeTaskId?: string | null) => void;
  deleteTask: (taskId: string) => void;
  setTaskCompletedToday: (taskId: string, completed: boolean) => void;
  searchFriendByEmail: (email: string) => Promise<Profile | null>;
  sendFriendRequest: (profile: Profile) => void;
  respondToFriendRequest: (requestId: string, action: 'accepted' | 'declined') => void;
  removeFriend: (friendshipId: string) => void;
};

const AppDataContext = createContext<AppDataState | null>(null);

function orderTasksForManualMove(
  tasks: WorkTask[],
  taskId: string,
  status: TaskStatus,
  beforeTaskId?: string | null,
) {
  const movingTask = tasks.find((task) => task.id === taskId);
  if (!movingTask) return tasks;

  const now = new Date().toISOString();
  const remainingTasks = tasks.filter((task) => task.id !== taskId);
  const targetTasks = remainingTasks
    .filter((task) => task.status === status)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const sourceAndOtherTasks = remainingTasks.filter((task) => task.status !== status);
  const requestedIndex = beforeTaskId
    ? targetTasks.findIndex((task) => task.id === beforeTaskId)
    : targetTasks.length;
  const insertIndex = requestedIndex >= 0 ? requestedIndex : targetTasks.length;
  const movedTask: WorkTask = {
    ...movingTask,
    status,
    updatedAt: now,
  };
  const nextTargetTasks = [
    ...targetTasks.slice(0, insertIndex),
    movedTask,
    ...targetTasks.slice(insertIndex),
  ].map((task, index) => ({
    ...task,
    sortOrder: (index + 1) * 1000,
    updatedAt: task.id === taskId ? now : task.updatedAt,
  }));

  return [...sourceAndOtherTasks, ...nextTargetTasks].sort((left, right) => {
    if (left.status !== right.status) return left.status.localeCompare(right.status);
    return left.sortOrder - right.sortOrder;
  });
}

function initialState(): PersistedState {
  const profile = createDemoProfile();
  const today = toLocalDateKey(new Date(), profile.timezone);

  return {
    profile,
    counts: createDemoCounts(today),
    tasks: createDemoTasks(),
    taskCompletions: createDemoTaskCompletions(today),
    friends: createDemoFriends(today),
    friendRequests: createDemoRequests(),
  };
}

async function loadRemoteState(userId: string): Promise<PersistedState> {
  const profile = await fetchCurrentProfile(userId);
  const today = toLocalDateKey(new Date(), profile.timezone);
  const [counts, tasks, friendGraph] = await Promise.all([
    fetchApplicationCounts(userId, profile.trackingStartedOn, today),
    fetchTasks(userId),
    fetchFriendGraph(userId, today),
  ]);
  const taskCompletions = await fetchTaskCompletions(
    tasks.map((task) => task.id),
    profile.trackingStartedOn,
    today,
  );

  return {
    profile,
    counts,
    tasks,
    taskCompletions,
    friends: friendGraph.friends,
    friendRequests: friendGraph.friendRequests,
  };
}

export function AppDataProvider({ children }: PropsWithChildren) {
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<DataNotice | null>(null);
  const [rangeMonths, setRangeMonths] = useState<RangeMonths>(6);
  const [state, setState] = useState<PersistedState>(() => initialState());
  const countMutationSequence = useRef(0);
  const countMutationQueue = useRef<Promise<void>>(Promise.resolve());
  const taskCompletionMutationQueues = useRef(new Map<string, Promise<void>>());
  const isRemoteMode = Boolean(isSupabaseConfigured && auth.userId && auth.userId !== 'local-user');

  const refreshRemoteState = useCallback(async () => {
    if (!auth.userId || !isRemoteMode) return;
    setState(await loadRemoteState(auth.userId));
  }, [auth.userId, isRemoteMode]);

  const clearNotice = useCallback(() => setNotice(null), []);

  const reportRemoteFailure = useCallback(
    (message: string) => {
      setNotice({ kind: 'error', message });
      refreshRemoteState().catch(() => undefined);
    },
    [refreshRemoteState],
  );

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!auth.isSignedIn) {
        setIsLoading(false);
        return;
      }

      if (isRemoteMode && auth.userId) {
        try {
          const remoteState = await loadRemoteState(auth.userId);
          if (!isMounted) return;
          setState(remoteState);
        } catch {
          if (!isMounted) return;
          setNotice({ kind: 'error', message: 'Could not load your data. Try signing in again.' });
        } finally {
          if (isMounted) setIsLoading(false);
        }
        return;
      }

      const raw = await AsyncStorage.getItem(storageKey);
      if (!isMounted) return;

      if (raw) {
        const persisted = JSON.parse(raw) as PersistedState;
        setState({
          ...persisted,
          taskCompletions: persisted.taskCompletions ?? [],
        });
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
  const todayCount = state.counts.find((item) => item.activityDate === today)?.count ?? 0;

  const updateProfile = useCallback<AppDataState['updateProfile']>(
    async (patch) => {
      const previousProfile = state.profile;
      const nextProfile = {
        ...previousProfile,
        ...patch,
      };

      setState((current) => ({
        ...current,
        profile: nextProfile,
      }));

      if (!isRemoteMode || !auth.userId) {
        setNotice({ kind: 'success', message: 'Profile updated.' });
        return;
      }

      try {
        const savedProfile = await remoteUpdateProfile(auth.userId, patch);
        setState((current) => ({
          ...current,
          profile: savedProfile,
        }));
        setNotice({ kind: 'success', message: 'Profile updated.' });
      } catch {
        setState((current) => ({
          ...current,
          profile: previousProfile,
        }));
        setNotice({ kind: 'error', message: 'Profile update failed. Changes were rolled back.' });
      }
    },
    [auth.userId, isRemoteMode, state.profile],
  );

  const applyTodayCount = useCallback(
    (count: number) => {
      const normalizedCount = Math.max(0, Math.floor(count));
      setState((current) => {
        const withoutToday = current.counts.filter((item) => item.activityDate !== today);

        return {
          ...current,
          counts: [...withoutToday, { activityDate: today, count: normalizedCount }].sort((a, b) =>
            a.activityDate.localeCompare(b.activityDate),
          ),
        };
      });
    },
    [today],
  );

  const enqueueCountMutation = useCallback(
    (mutation: () => Promise<number>) => {
      const sequence = ++countMutationSequence.current;
      countMutationQueue.current = countMutationQueue.current
        .catch(() => undefined)
        .then(mutation)
        .then((savedCount) => {
          if (sequence === countMutationSequence.current) applyTodayCount(savedCount);
        })
        .catch(() => reportRemoteFailure("Could not save today's application count."));
    },
    [applyTodayCount, reportRemoteFailure],
  );

  const setTodayCount = useCallback<AppDataState['setTodayCount']>(
    (count) => {
      const normalizedCount = Math.max(0, Math.floor(count));
      applyTodayCount(normalizedCount);

      if (isRemoteMode) {
        enqueueCountMutation(() => remoteSetTodayApplicationCount(normalizedCount));
      }
    },
    [applyTodayCount, enqueueCountMutation, isRemoteMode],
  );

  const adjustTodayCount = useCallback(
    (delta: number) => {
      const nextCount = Math.max(0, todayCount + delta);
      const remoteDelta = nextCount - todayCount;
      applyTodayCount(nextCount);

      if (isRemoteMode && remoteDelta !== 0) {
        enqueueCountMutation(() => remoteAdjustTodayApplicationCount(remoteDelta));
      }
    },
    [applyTodayCount, enqueueCountMutation, isRemoteMode, todayCount],
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
          .catch(() => reportRemoteFailure('Could not save the new task.'));
      }
    },
    [auth.userId, isRemoteMode, reportRemoteFailure],
  );

  const updateTask = useCallback<AppDataState['updateTask']>(
    (taskId, patch) => {
      const existingTask = state.tasks.find((task) => task.id === taskId);
      if (!existingTask) return;

      const updatedTask: WorkTask = {
        ...existingTask,
        ...patch,
        updatedAt: new Date().toISOString(),
      };

      setState((current) => ({
        ...current,
        tasks: current.tasks.map((task) => (task.id === taskId ? updatedTask : task)),
      }));

      if (isRemoteMode && auth.userId) {
        remoteUpsertTask(auth.userId, updatedTask).catch(() =>
          reportRemoteFailure('Could not save the task update.'),
        );
      }
    },
    [auth.userId, isRemoteMode, reportRemoteFailure, state.tasks],
  );

  const moveTask = useCallback<AppDataState['moveTask']>(
    (taskId, status, beforeTaskId) => {
      const nextTasks = orderTasksForManualMove(state.tasks, taskId, status, beforeTaskId);
      const changedTasks = nextTasks.filter((nextTask) => {
        const previousTask = state.tasks.find((task) => task.id === nextTask.id);
        return (
          previousTask &&
          (previousTask.status !== nextTask.status || previousTask.sortOrder !== nextTask.sortOrder)
        );
      });

      if (changedTasks.length === 0) return;

      setState((current) => ({
        ...current,
        tasks: orderTasksForManualMove(current.tasks, taskId, status, beforeTaskId),
      }));

      if (isRemoteMode && auth.userId) {
        Promise.all(changedTasks.map((task) => remoteUpsertTask(auth.userId as string, task))).catch(() =>
          reportRemoteFailure('Could not save the task order.'),
        );
      }
    },
    [auth.userId, isRemoteMode, reportRemoteFailure, state.tasks],
  );

  const deleteTask = useCallback<AppDataState['deleteTask']>((taskId) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId),
      taskCompletions: current.taskCompletions.filter((completion) => completion.taskId !== taskId),
    }));

    if (isRemoteMode) {
      remoteDeleteTask(taskId).catch(() => reportRemoteFailure('Could not delete the task.'));
    }
  }, [isRemoteMode, reportRemoteFailure]);

  const setTaskCompletedToday = useCallback<AppDataState['setTaskCompletedToday']>(
    (taskId, completed) => {
      setState((current) => ({
        ...current,
        taskCompletions: completed
          ? [
              ...current.taskCompletions.filter(
                (completion) => completion.taskId !== taskId || completion.activityDate !== today,
              ),
              { taskId, activityDate: today },
            ]
          : current.taskCompletions.filter(
              (completion) => completion.taskId !== taskId || completion.activityDate !== today,
            ),
      }));

      if (isRemoteMode) {
        const queuedMutation = (taskCompletionMutationQueues.current.get(taskId) ?? Promise.resolve())
          .catch(() => undefined)
          .then(() => remoteSetTodayTaskCompletion(taskId, completed))
          .then(() => undefined)
          .catch(() => reportRemoteFailure('Could not save the task check-in.'));

        taskCompletionMutationQueues.current.set(taskId, queuedMutation);
        queuedMutation.finally(() => {
          if (taskCompletionMutationQueues.current.get(taskId) === queuedMutation) {
            taskCompletionMutationQueues.current.delete(taskId);
          }
        });
      }
    },
    [isRemoteMode, reportRemoteFailure, today],
  );

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
          .catch(() => reportRemoteFailure('Could not send the friend request.'));
      }
    },
    [isRemoteMode, refreshRemoteState, reportRemoteFailure],
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
          .catch(() => reportRemoteFailure('Could not update the friend request.'));
      }
    },
    [isRemoteMode, refreshRemoteState, reportRemoteFailure, today],
  );

  const removeFriend = useCallback<AppDataState['removeFriend']>(
    (friendshipId) => {
      const friend = state.friends.find((item) => item.id === friendshipId);
      if (!friend) return;

      setState((current) => ({
        ...current,
        friends: current.friends.filter((item) => item.id !== friendshipId),
      }));

      if (!isRemoteMode) {
        setNotice({ kind: 'success', message: 'Friend removed.' });
        return;
      }

      remoteRemoveFriendship(friendshipId)
        .then((removed) => {
          setNotice({
            kind: 'success',
            message: removed ? 'Friend removed.' : 'Friend was already removed.',
          });
          return refreshRemoteState();
        })
        .catch(() => reportRemoteFailure('Could not remove the friend.'));
    },
    [isRemoteMode, refreshRemoteState, reportRemoteFailure, state.friends],
  );

  const value = useMemo<AppDataState>(
    () => ({
      ...state,
      isLoading,
      notice,
      rangeMonths,
      today,
      clearNotice,
      updateProfile,
      setRangeMonths,
      adjustTodayCount,
      setTodayCount,
      createTask,
      updateTask,
      moveTask,
      deleteTask,
      setTaskCompletedToday,
      searchFriendByEmail,
      sendFriendRequest,
      respondToFriendRequest,
      removeFriend,
    }),
    [
      adjustTodayCount,
      clearNotice,
      createTask,
      deleteTask,
      isLoading,
      moveTask,
      notice,
      rangeMonths,
      removeFriend,
      respondToFriendRequest,
      searchFriendByEmail,
      sendFriendRequest,
      setTodayCount,
      setTaskCompletedToday,
      state,
      today,
      updateProfile,
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
