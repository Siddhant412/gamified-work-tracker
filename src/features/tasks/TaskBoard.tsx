import { CheckCircle2, Circle, Clock3, Pencil, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, EmptyState, IconButton, MutedText } from '@/src/components/ui';
import { spacing } from '@/src/theme/tokens';
import { useTheme } from '@/src/theme/useTheme';
import type { TaskStatus, WorkTask } from '@/src/types/domain';

import { TaskTileEditor } from './TaskTileEditor';

const columns: { status: TaskStatus; title: string; icon: typeof Circle }[] = [
  { status: 'todo', title: 'Todo', icon: Circle },
  { status: 'doing', title: 'Doing', icon: Clock3 },
  { status: 'done', title: 'Done', icon: CheckCircle2 },
];

export function TaskBoard({
  tasks,
  onMoveTask,
  onUpdateTask,
  onDeleteTask,
}: {
  tasks: WorkTask[];
  onMoveTask: (taskId: string, status: TaskStatus, beforeTaskId?: string | null) => void;
  onUpdateTask: (taskId: string, patch: Partial<WorkTask>) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  return (
    <View style={styles.board}>
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.status);
        const Icon = column.icon;

        return (
          <Card key={column.status} style={styles.column}>
            <View style={styles.columnHeader}>
              <Icon size={18} color="#136f3a" strokeWidth={2.4} />
              <AppText style={styles.columnTitle}>{column.title}</AppText>
              <MutedText style={styles.count}>{columnTasks.length}</MutedText>
            </View>
            <View style={styles.taskList}>
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onMoveTask={onMoveTask}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                />
              ))}
              {columnTasks.length === 0 ? (
                <EmptyState
                  icon={Icon}
                  title={`No ${column.title.toLowerCase()} tasks`}
                  description="Tasks that match the current controls will appear here."
                />
              ) : null}
            </View>
          </Card>
        );
      })}
    </View>
  );
}

function TaskCard({
  task,
  onMoveTask,
  onUpdateTask,
  onDeleteTask,
}: {
  task: WorkTask;
  onMoveTask: (taskId: string, status: TaskStatus, beforeTaskId?: string | null) => void;
  onUpdateTask: (taskId: string, patch: Partial<WorkTask>) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const { colors } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const nextStatuses = columns.filter((column) => column.status !== task.status);

  return (
    <View style={[styles.taskCard, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
      {isEditing ? (
        <TaskTileEditor
          task={task}
          onCancel={() => setIsEditing(false)}
          onSave={(patch) => {
            onUpdateTask(task.id, patch);
            setIsEditing(false);
          }}
        />
      ) : (
        <>
          <View style={styles.taskTop}>
            <View style={styles.taskCopy}>
              <AppText style={styles.taskTitle}>{task.title}</AppText>
              {task.notes ? <MutedText style={styles.taskNotes}>{task.notes}</MutedText> : null}
            </View>
            <View style={styles.iconActions}>
              <IconButton icon={Pencil} label="Edit task" onPress={() => setIsEditing(true)} />
              <IconButton
                icon={Trash2}
                label="Delete task"
                tone="danger"
                onPress={() => onDeleteTask(task.id)}
              />
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={[styles.priority, { borderColor: colors.border }]}>
              <MutedText style={styles.priorityText}>{task.priority}</MutedText>
            </View>
            {task.dueDate ? <MutedText style={styles.dueText}>Due {task.dueDate}</MutedText> : null}
          </View>
          <View style={styles.moveRow}>
            {nextStatuses.map((column) => (
              <Button
                key={column.status}
                title={column.title}
                accessibilityLabel={`Move ${task.title} to ${column.title}`}
                variant="ghost"
                onPress={() => onMoveTask(task.id, column.status)}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    gap: spacing.md,
  },
  column: {
    flex: 1,
    minWidth: 260,
    gap: spacing.lg,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  columnTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
  },
  count: {
    fontSize: 13,
    fontWeight: '900',
  },
  taskList: {
    gap: spacing.md,
  },
  taskCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.md,
  },
  taskTop: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  taskCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  iconActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  taskTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  taskNotes: {
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  priority: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  dueText: {
    fontSize: 12,
    fontWeight: '800',
  },
  moveRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
