import { Filter, ListChecks, Plus, RotateCcw } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  EmptyState,
  LoadingState,
  MutedText,
  Notice,
  Screen,
  SectionHeader,
  SegmentedControl,
  TextField,
} from '@/src/components/ui';
import { useAppData } from '@/src/providers/AppDataProvider';
import { spacing } from '@/src/theme/tokens';
import type { TaskPriority, TaskStatus } from '@/src/types/domain';

import { TaskBoard } from './TaskBoard';
import {
  filterAndSortTasks,
  TaskPriorityFilter,
  TaskSortMode,
  TaskStatusFilter,
} from './taskFilters';

const priorityOptions: { label: string; value: TaskPriority }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

const priorityFilterOptions: { label: string; value: TaskPriorityFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

const statusFilterOptions: { label: string; value: TaskStatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Todo', value: 'todo' },
  { label: 'Doing', value: 'doing' },
  { label: 'Done', value: 'done' },
];

const sortOptions: { label: string; value: TaskSortMode }[] = [
  { label: 'Manual', value: 'manual' },
  { label: 'Priority', value: 'priority' },
  { label: 'Due', value: 'due' },
  { label: 'Recent', value: 'recent' },
];

export function TasksScreen() {
  const data = useAppData();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriorityFilter>('all');
  const [sortMode, setSortMode] = useState<TaskSortMode>('manual');
  const filteredTasks = useMemo(
    () =>
      filterAndSortTasks(data.tasks, {
        query,
        status: statusFilter,
        priority: priorityFilter,
        sort: sortMode,
      }),
    [data.tasks, priorityFilter, query, sortMode, statusFilter],
  );
  const activeFilterCount = [query.trim(), statusFilter !== 'all', priorityFilter !== 'all'].filter(Boolean).length;
  const statusCounts = useMemo(
    () =>
      data.tasks.reduce<Record<TaskStatus, number>>(
        (acc, task) => {
          acc[task.status] += 1;
          return acc;
        },
        { todo: 0, doing: 0, done: 0 },
      ),
    [data.tasks],
  );

  function resetFilters() {
    setQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setSortMode('manual');
  }

  if (data.isLoading) return <LoadingState />;

  return (
    <Screen>
      <SectionHeader
        title="Tasks"
        subtitle="A compact Kanban board for applications, follow-ups, resume edits, and interview prep."
      />

      {data.notice ? (
        <Notice kind={data.notice.kind} message={data.notice.message} onDismiss={data.clearNotice} />
      ) : null}

      <Card style={styles.createCard}>
        <View style={styles.formRow}>
          <TextField
            value={title}
            onChangeText={setTitle}
            placeholder="Add a task"
            returnKeyType="done"
            style={styles.titleInput}
          />
          <SegmentedControl value={priority} options={priorityOptions} onChange={setPriority} />
          <Button
            title="Create"
            icon={Plus}
            disabled={!title.trim()}
            onPress={() => {
              data.createTask({ title, notes, priority });
              setTitle('');
              setNotes('');
              setPriority('medium');
            }}
          />
        </View>
        <TextField
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes"
          multiline
          style={styles.notesInput}
        />
      </Card>

      <Card style={styles.filterCard}>
        <View style={styles.filterHeader}>
          <View style={styles.filterTitleRow}>
            <Filter size={18} color="#136f3a" strokeWidth={2.4} />
            <SectionHeader
              title="Board Controls"
              subtitle={`${filteredTasks.length} of ${data.tasks.length} tasks shown`}
            />
          </View>
          <Button
            title="Reset"
            icon={RotateCcw}
            variant="ghost"
            disabled={activeFilterCount === 0 && sortMode === 'manual'}
            onPress={resetFilters}
          />
        </View>
        <View style={styles.formRow}>
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder="Search tasks"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
          />
        </View>
        <View style={styles.filterGroups}>
          <View style={styles.filterGroup}>
            <SegmentedControl value={statusFilter} options={statusFilterOptions} onChange={setStatusFilter} />
          </View>
          <View style={styles.filterGroup}>
            <SegmentedControl
              value={priorityFilter}
              options={priorityFilterOptions}
              onChange={setPriorityFilter}
            />
          </View>
          <View style={styles.filterGroup}>
            <SegmentedControl value={sortMode} options={sortOptions} onChange={setSortMode} />
          </View>
        </View>
        <View style={styles.summaryRow}>
          <StatusSummary label="Todo" count={statusCounts.todo} />
          <StatusSummary label="Doing" count={statusCounts.doing} />
          <StatusSummary label="Done" count={statusCounts.done} />
        </View>
      </Card>

      {data.tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description="Create tasks for applications, follow-ups, resume edits, and interview prep."
        />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="No tasks match"
          description="Adjust the search, status, priority, or sort controls to bring tasks back into view."
          action={<Button title="Reset filters" icon={RotateCcw} variant="secondary" onPress={resetFilters} />}
        />
      ) : (
        <TaskBoard
          tasks={filteredTasks}
          onMoveTask={data.moveTask}
          onUpdateTask={data.updateTask}
          onDeleteTask={data.deleteTask}
        />
      )}
    </Screen>
  );
}

function StatusSummary({ label, count }: { label: string; count: number }) {
  return (
    <View style={styles.statusSummary}>
      <AppText style={styles.statusCount}>{count}</AppText>
      <MutedText style={styles.statusLabel}>{label}</MutedText>
    </View>
  );
}

const styles = StyleSheet.create({
  createCard: {
    gap: spacing.md,
  },
  filterCard: {
    gap: spacing.lg,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  filterTitleRow: {
    flex: 1,
    minWidth: 240,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  titleInput: {
    flex: 1,
    minWidth: 230,
  },
  searchInput: {
    flex: 1,
    minWidth: 240,
  },
  notesInput: {
    minHeight: 74,
    paddingTop: spacing.md,
  },
  filterGroups: {
    gap: spacing.md,
  },
  filterGroup: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statusSummary: {
    minWidth: 96,
    gap: spacing.xs,
  },
  statusCount: {
    fontSize: 24,
    fontWeight: '900',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
