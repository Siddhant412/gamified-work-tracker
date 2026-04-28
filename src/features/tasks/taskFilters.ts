import type { TaskPriority, TaskStatus, WorkTask } from '@/src/types/domain';

export type TaskStatusFilter = 'all' | TaskStatus;
export type TaskPriorityFilter = 'all' | TaskPriority;
export type TaskSortMode = 'manual' | 'priority' | 'due' | 'recent';

export type TaskFilterOptions = {
  query: string;
  status: TaskStatusFilter;
  priority: TaskPriorityFilter;
  sort: TaskSortMode;
};

const priorityRank: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function filterAndSortTasks(tasks: WorkTask[], options: TaskFilterOptions) {
  const query = options.query.trim().toLowerCase();

  return [...tasks]
    .filter((task) => {
      const matchesQuery =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.notes.toLowerCase().includes(query);
      const matchesStatus = options.status === 'all' || task.status === options.status;
      const matchesPriority = options.priority === 'all' || task.priority === options.priority;

      return matchesQuery && matchesStatus && matchesPriority;
    })
    .sort((left, right) => {
      if (options.sort === 'priority') {
        return priorityRank[right.priority] - priorityRank[left.priority] || left.sortOrder - right.sortOrder;
      }

      if (options.sort === 'due') {
        if (!left.dueDate && !right.dueDate) return left.sortOrder - right.sortOrder;
        if (!left.dueDate) return 1;
        if (!right.dueDate) return -1;
        return left.dueDate.localeCompare(right.dueDate) || left.sortOrder - right.sortOrder;
      }

      if (options.sort === 'recent') {
        return right.updatedAt.localeCompare(left.updatedAt);
      }

      return left.sortOrder - right.sortOrder;
    });
}
