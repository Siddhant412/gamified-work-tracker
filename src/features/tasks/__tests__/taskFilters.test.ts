import { filterAndSortTasks } from '@/src/features/tasks/taskFilters';
import type { WorkTask } from '@/src/types/domain';

const tasks: WorkTask[] = [
  {
    id: '1',
    title: 'Apply to startup roles',
    notes: 'Backend roles',
    status: 'todo',
    priority: 'high',
    dueDate: '2026-05-02',
    sortOrder: 2,
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-21T00:00:00.000Z',
  },
  {
    id: '2',
    title: 'Update resume',
    notes: 'Portfolio link',
    status: 'doing',
    priority: 'medium',
    dueDate: '2026-04-30',
    sortOrder: 1,
    createdAt: '2026-04-19T00:00:00.000Z',
    updatedAt: '2026-04-24T00:00:00.000Z',
  },
  {
    id: '3',
    title: 'Archive old leads',
    notes: '',
    status: 'done',
    priority: 'low',
    dueDate: null,
    sortOrder: 3,
    createdAt: '2026-04-18T00:00:00.000Z',
    updatedAt: '2026-04-20T00:00:00.000Z',
  },
];

describe('task filters', () => {
  it('filters by query, status, and priority', () => {
    expect(
      filterAndSortTasks(tasks, {
        query: 'resume',
        status: 'doing',
        priority: 'medium',
        sort: 'manual',
      }).map((task) => task.id),
    ).toEqual(['2']);
  });

  it('sorts due dated tasks first and leaves undated tasks last', () => {
    expect(
      filterAndSortTasks(tasks, {
        query: '',
        status: 'all',
        priority: 'all',
        sort: 'due',
      }).map((task) => task.id),
    ).toEqual(['2', '1', '3']);
  });

  it('sorts priority high to low', () => {
    expect(
      filterAndSortTasks(tasks, {
        query: '',
        status: 'all',
        priority: 'all',
        sort: 'priority',
      }).map((task) => task.id),
    ).toEqual(['1', '2', '3']);
  });
});
