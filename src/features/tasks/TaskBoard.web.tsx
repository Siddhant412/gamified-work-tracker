import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { CheckCircle2, Circle, Clock3, GripVertical, Trash2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, IconButton, MutedText } from '@/src/components/ui';
import { spacing } from '@/src/theme/tokens';
import { useTheme } from '@/src/theme/useTheme';
import type { TaskStatus, WorkTask } from '@/src/types/domain';

const columns: { status: TaskStatus; title: string; icon: typeof Circle }[] = [
  { status: 'todo', title: 'Todo', icon: Circle },
  { status: 'doing', title: 'Doing', icon: Clock3 },
  { status: 'done', title: 'Done', icon: CheckCircle2 },
];

export function TaskBoard({
  tasks,
  onMoveTask,
  onDeleteTask,
}: {
  tasks: WorkTask[];
  onMoveTask: (taskId: string, status: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const taskId = String(event.active.id);
    const status = event.over?.id as TaskStatus | undefined;
    if (status && columns.some((column) => column.status === status)) {
      onMoveTask(taskId, status);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <View style={styles.board}>
        {columns.map((column) => (
          <TaskColumn
            key={column.status}
            column={column}
            tasks={tasks.filter((task) => task.status === column.status)}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </View>
    </DndContext>
  );
}

function TaskColumn({
  column,
  tasks,
  onDeleteTask,
}: {
  column: { status: TaskStatus; title: string; icon: typeof Circle };
  tasks: WorkTask[];
  onDeleteTask: (taskId: string) => void;
}) {
  const { colors } = useTheme();
  const { isOver, setNodeRef } = useDroppable({ id: column.status });
  const Icon = column.icon;

  return (
    <Card
      style={[
        styles.column,
        {
          borderColor: isOver ? colors.primary : colors.border,
          backgroundColor: isOver ? colors.primarySoft : colors.surface,
        },
      ]}
    >
      <View style={styles.columnHeader}>
        <Icon size={18} color={colors.primary} strokeWidth={2.4} />
        <AppText style={styles.columnTitle}>{column.title}</AppText>
        <MutedText style={styles.count}>{tasks.length}</MutedText>
      </View>
      <View ref={setNodeRef as never} style={styles.taskList}>
        {tasks.map((task) => (
          <DraggableTaskCard key={task.id} task={task} onDeleteTask={onDeleteTask} />
        ))}
        {tasks.length === 0 ? <MutedText style={styles.empty}>Drop tasks here.</MutedText> : null}
      </View>
    </Card>
  );
}

function DraggableTaskCard({
  task,
  onDeleteTask,
}: {
  task: WorkTask;
  onDeleteTask: (taskId: string) => void;
}) {
  const { colors } = useTheme();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });

  return (
    <View
      ref={setNodeRef as never}
      style={[
        styles.taskCard,
        {
          backgroundColor: colors.surfaceSoft,
          borderColor: isDragging ? colors.primary : colors.border,
          opacity: isDragging ? 0.72 : 1,
          transform: transform ? [{ translateX: transform.x }, { translateY: transform.y }] : undefined,
        },
      ]}
      {...(listeners as object)}
      {...(attributes as object)}
    >
      <View style={styles.taskTop}>
        <GripVertical size={18} color={colors.muted} strokeWidth={2.2} />
        <View style={styles.taskCopy}>
          <AppText style={styles.taskTitle}>{task.title}</AppText>
          {task.notes ? <MutedText style={styles.taskNotes}>{task.notes}</MutedText> : null}
        </View>
        <IconButton icon={Trash2} label="Delete task" tone="danger" onPress={() => onDeleteTask(task.id)} />
      </View>
      <View style={styles.metaRow}>
        <View style={[styles.priority, { borderColor: colors.border }]}>
          <MutedText style={styles.priorityText}>{task.priority}</MutedText>
        </View>
        {task.dueDate ? <MutedText style={styles.dueText}>Due {task.dueDate}</MutedText> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    minHeight: 240,
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
  empty: {
    fontSize: 13,
    fontWeight: '700',
  },
});
