import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  LoadingState,
  Screen,
  SectionHeader,
  SegmentedControl,
  TextField,
} from '@/src/components/ui';
import { useAppData } from '@/src/providers/AppDataProvider';
import { spacing } from '@/src/theme/tokens';
import type { TaskPriority } from '@/src/types/domain';

import { TaskBoard } from './TaskBoard';

const priorityOptions: { label: string; value: TaskPriority }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

export function TasksScreen() {
  const data = useAppData();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');

  if (data.isLoading) return <LoadingState />;

  return (
    <Screen>
      <SectionHeader
        title="Tasks"
        subtitle="A compact Kanban board for applications, follow-ups, resume edits, and interview prep."
      />

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

      <TaskBoard tasks={data.tasks} onMoveTask={data.moveTask} onDeleteTask={data.deleteTask} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  createCard: {
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
  notesInput: {
    minHeight: 74,
    paddingTop: spacing.md,
  },
});
