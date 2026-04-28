import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CheckCircle2, Circle, Clock3, GripVertical, Pencil, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText, Card, EmptyState, IconButton, MutedText } from '@/src/components/ui';
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
  onMoveTask: (taskId: string, status: TaskStatus) => void;
  onUpdateTask: (taskId: string, patch: Partial<WorkTask>) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const { width } = useWindowDimensions();
  const isNarrow = width < 980;

  function handleDragEnd(event: DragEndEvent) {
    const taskId = String(event.active.id);
    const status = event.over?.id as TaskStatus | undefined;
    if (status && columns.some((column) => column.status === status)) {
      onMoveTask(taskId, status);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <View style={[styles.board, isNarrow && styles.boardNarrow]}>
        {columns.map((column) => (
          <TaskColumn
            key={column.status}
            column={column}
            tasks={tasks.filter((task) => task.status === column.status)}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            isNarrow={isNarrow}
          />
        ))}
      </View>
    </DndContext>
  );
}

function TaskColumn({
  column,
  tasks,
  onUpdateTask,
  onDeleteTask,
  isNarrow,
}: {
  column: { status: TaskStatus; title: string; icon: typeof Circle };
  tasks: WorkTask[];
  onUpdateTask: (taskId: string, patch: Partial<WorkTask>) => void;
  onDeleteTask: (taskId: string) => void;
  isNarrow: boolean;
}) {
  const { colors } = useTheme();
  const { isOver, setNodeRef } = useDroppable({ id: column.status });
  const Icon = column.icon;

  return (
    <Card
      style={[
        styles.column,
        isNarrow && styles.columnNarrow,
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
          <DraggableTaskCard
            key={task.id}
            task={task}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
          />
        ))}
        {tasks.length === 0 ? (
          <EmptyState
            icon={Icon}
            title={`No ${column.title.toLowerCase()} tasks`}
            description="Drag tasks here or adjust the current controls."
          />
        ) : null}
      </View>
    </Card>
  );
}

function DraggableTaskCard({
  task,
  onUpdateTask,
  onDeleteTask,
}: {
  task: WorkTask;
  onUpdateTask: (taskId: string, patch: Partial<WorkTask>) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const { colors } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
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
    >
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
            <View
              style={styles.dragHandle}
              {...(listeners as object)}
              {...(attributes as object)}
            >
              <GripVertical size={18} color={colors.muted} strokeWidth={2.2} />
            </View>
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
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  boardNarrow: {
    flexDirection: 'column',
  },
  column: {
    flex: 1,
    minWidth: 260,
    gap: spacing.lg,
  },
  columnNarrow: {
    width: '100%',
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
  dragHandle: {
    minHeight: 42,
    justifyContent: 'center',
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
});
