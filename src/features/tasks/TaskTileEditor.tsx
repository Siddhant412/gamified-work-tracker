import { Save, X } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, MutedText, SegmentedControl, TextField } from '@/src/components/ui';
import { spacing } from '@/src/theme/tokens';
import type { ISODate, TaskPriority, WorkTask } from '@/src/types/domain';

const priorityOptions: { label: string; value: TaskPriority }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

export function TaskTileEditor({
  task,
  onSave,
  onCancel,
}: {
  task: WorkTask;
  onSave: (patch: Partial<WorkTask>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ?? '');
  const trimmedTitle = title.trim();
  const trimmedDueDate = dueDate.trim();
  const dueDateIsValid = !trimmedDueDate || /^\d{4}-\d{2}-\d{2}$/.test(trimmedDueDate);

  function save() {
    if (!trimmedTitle || !dueDateIsValid) return;

    onSave({
      title: trimmedTitle,
      notes: notes.trim(),
      priority,
      dueDate: trimmedDueDate ? (trimmedDueDate as ISODate) : null,
    });
  }

  return (
    <View style={styles.editor}>
      <TextField value={title} onChangeText={setTitle} placeholder="Task title" />
      <TextField
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes"
        multiline
        style={styles.notesInput}
      />
      <View style={styles.metaRow}>
        <SegmentedControl value={priority} options={priorityOptions} onChange={setPriority} />
        <TextField
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="YYYY-MM-DD"
          style={styles.dateInput}
        />
      </View>
      {!dueDateIsValid ? <MutedText style={styles.error}>Date must be YYYY-MM-DD.</MutedText> : null}
      <View style={styles.actions}>
        <Button title="Save" icon={Save} disabled={!trimmedTitle || !dueDateIsValid} onPress={save} />
        <Button title="Cancel" icon={X} variant="ghost" onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  editor: {
    gap: spacing.md,
  },
  notesInput: {
    minHeight: 78,
    paddingTop: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
  },
  dateInput: {
    width: 150,
  },
  error: {
    fontSize: 12,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
