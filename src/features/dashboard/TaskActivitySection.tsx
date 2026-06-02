import { CheckCircle2, Circle, Flame, ListChecks } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ActivityHeatmap } from '@/src/components/ActivityHeatmap';
import { AppText, Button, Card, EmptyState, MutedText, SectionHeader, SegmentedControl } from '@/src/components/ui';
import { getCurrentStreak } from '@/src/lib/stats';
import { useAppData } from '@/src/providers/AppDataProvider';
import { spacing } from '@/src/theme/tokens';
import { useTheme } from '@/src/theme/useTheme';
import type { DailyApplicationCount, RangeMonths, WorkTask } from '@/src/types/domain';

const rangeOptions: { label: string; value: RangeMonths }[] = [
  { label: '3M', value: 3 },
  { label: '6M', value: 6 },
  { label: '12M', value: 12 },
];

export function TaskActivitySection() {
  const data = useAppData();
  const { width } = useWindowDimensions();
  const tasks = useMemo(
    () =>
      [...data.tasks].sort((left, right) => {
        if (left.status !== right.status) return left.status === 'done' ? 1 : right.status === 'done' ? -1 : 0;
        return left.sortOrder - right.sortOrder;
      }),
    [data.tasks],
  );

  return (
    <Card style={styles.card}>
      <SectionHeader
        title="Daily Task Activity"
        subtitle="Keep repeatable work visible. Each check-in is recorded for today in your profile timezone."
        action={<SegmentedControl value={data.rangeMonths} options={rangeOptions} onChange={data.setRangeMonths} />}
      />
      <CompletionLegend />
      {tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Create your first repeatable task"
          description="Tasks from your board appear here automatically with a private daily activity heatmap."
        />
      ) : (
        <View style={styles.list}>
          {tasks.map((task) => (
            <TaskActivityRow
              key={task.id}
              task={task}
              completions={data.taskCompletions
                .filter((completion) => completion.taskId === task.id)
                .map((completion) => ({ activityDate: completion.activityDate, count: 1 }))}
              today={data.today}
              months={data.rangeMonths}
              isNarrow={width < 880}
              onToggle={data.setTaskCompletedToday}
            />
          ))}
        </View>
      )}
    </Card>
  );
}

function TaskActivityRow({
  task,
  completions,
  today,
  months,
  isNarrow,
  onToggle,
}: {
  task: WorkTask;
  completions: DailyApplicationCount[];
  today: DailyApplicationCount['activityDate'];
  months: RangeMonths;
  isNarrow: boolean;
  onToggle: (taskId: string, completed: boolean) => void;
}) {
  const { colors } = useTheme();
  const completedToday = completions.some((completion) => completion.activityDate === today);
  const streak = getCurrentStreak(completions, today);
  const Icon = completedToday ? CheckCircle2 : Circle;

  return (
    <View
      testID={`task-activity-${task.id}`}
      style={[
        styles.row,
        isNarrow && styles.rowNarrow,
        {
          backgroundColor: colors.surfaceSoft,
          borderColor: completedToday ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Icon size={20} color={completedToday ? colors.primary : colors.muted} strokeWidth={2.4} />
          <View style={styles.titleCopy}>
            <AppText style={styles.title}>{task.title}</AppText>
            <MutedText style={styles.meta}>
              {task.status === 'done' ? 'Board task completed' : `${task.status} on board`}
            </MutedText>
          </View>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <AppText style={styles.statValue}>{completions.length}</AppText>
            <MutedText style={styles.statLabel}>check-ins</MutedText>
          </View>
          <View style={styles.stat}>
            <View style={styles.streakValue}>
              <Flame size={15} color={colors.accent} strokeWidth={2.4} />
              <AppText style={styles.statValue}>{streak}</AppText>
            </View>
            <MutedText style={styles.statLabel}>day streak</MutedText>
          </View>
        </View>
        <Button
          title={completedToday ? 'Done today' : 'Mark done'}
          icon={CheckCircle2}
          variant={completedToday ? 'secondary' : 'primary'}
          onPress={() => onToggle(task.id, !completedToday)}
          accessibilityLabel={`${completedToday ? 'Clear' : 'Mark'} ${task.title} ${completedToday ? 'for' : 'done for'} today`}
          style={styles.toggle}
        />
      </View>
      <View style={[styles.heatmap, isNarrow && styles.heatmapNarrow]}>
        <ActivityHeatmap
          counts={completions}
          endDate={today}
          months={months}
          compact
          mode="completion"
          showLegend={false}
        />
      </View>
    </View>
  );
}

function CompletionLegend() {
  const { colors } = useTheme();

  return (
    <View style={styles.legend}>
      <MutedText style={styles.legendText}>Not done</MutedText>
      <View style={[styles.legendCell, { backgroundColor: colors.heatmap[0], borderColor: colors.border }]} />
      <View style={[styles.legendCell, { backgroundColor: colors.heatmap[4], borderColor: colors.border }]} />
      <MutedText style={styles.legendText}>Done</MutedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xl,
  },
  list: {
    gap: spacing.md,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '800',
  },
  row: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  rowNarrow: {
    alignItems: 'stretch',
    flexDirection: 'column',
  },
  copy: {
    width: 238,
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titleCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  meta: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  stat: {
    gap: 2,
  },
  streakValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  toggle: {
    alignSelf: 'flex-start',
  },
  heatmap: {
    flex: 1,
    minWidth: 0,
  },
  heatmapNarrow: {
    width: '100%',
  },
});
