import { Briefcase, CalendarCheck, Minus, Plus, TrendingUp } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ActivityHeatmap } from '@/src/components/ActivityHeatmap';
import {
  AppText,
  Button,
  Card,
  IconButton,
  LoadingState,
  MutedText,
  Notice,
  Screen,
  SectionHeader,
  SegmentedControl,
  TextField,
} from '@/src/components/ui';
import { getApplicationStats } from '@/src/lib/stats';
import { spacing } from '@/src/theme/tokens';
import { useTheme } from '@/src/theme/useTheme';
import { useAppData } from '@/src/providers/AppDataProvider';
import type { RangeMonths } from '@/src/types/domain';

import { TaskActivitySection } from './TaskActivitySection';

const rangeOptions: { label: string; value: RangeMonths }[] = [
  { label: '3M', value: 3 },
  { label: '6M', value: 6 },
  { label: '12M', value: 12 },
];

const repeatStartDelayMs = 320;
const repeatIntervalMs = 120;

export function HomeScreen() {
  const data = useAppData();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isNarrow = width < 620;
  const [typedToday, setTypedToday] = useState('0');
  const latestTodayCountRef = useRef(0);
  const repeatDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const suppressNextPressRef = useRef(false);

  const stats = data.isLoading
    ? null
    : getApplicationStats(data.counts, data.today, data.profile.trackingStartedOn);
  const displayedToday = stats?.today ?? 0;

  useEffect(() => {
    if (!data.isLoading) {
      latestTodayCountRef.current = displayedToday;
      setTypedToday(String(displayedToday));
    }
  }, [data.isLoading, displayedToday]);

  const stopRepeatingCounter = useCallback(() => {
    if (repeatDelayRef.current) {
      clearTimeout(repeatDelayRef.current);
      repeatDelayRef.current = null;
    }

    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
  }, []);

  useEffect(() => stopRepeatingCounter, [stopRepeatingCounter]);

  const setCounterValue = useCallback(
    (count: number) => {
      const nextCount = Math.max(0, Math.floor(count));
      latestTodayCountRef.current = nextCount;
      setTypedToday(String(nextCount));
      data.setTodayCount(nextCount);
    },
    [data],
  );

  const applyCounterStep = useCallback(
    (delta: number) => {
      setCounterValue(latestTodayCountRef.current + delta);
    },
    [setCounterValue],
  );

  const startRepeatingCounter = useCallback(
    (delta: number) => {
      suppressNextPressRef.current = true;
      stopRepeatingCounter();
      applyCounterStep(delta);

      repeatDelayRef.current = setTimeout(() => {
        repeatDelayRef.current = null;
        repeatIntervalRef.current = setInterval(() => {
          applyCounterStep(delta);
        }, repeatIntervalMs);
      }, repeatStartDelayMs);
    },
    [applyCounterStep, stopRepeatingCounter],
  );

  const handleCounterPress = useCallback(
    (delta: number) => {
      if (suppressNextPressRef.current) {
        suppressNextPressRef.current = false;
        return;
      }

      applyCounterStep(delta);
    },
    [applyCounterStep],
  );

  if (data.isLoading || !stats) return <LoadingState />;

  function commitTypedToday(rawValue = typedToday) {
    const parsedValue = Number.parseInt(rawValue, 10);
    const nextCount = Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0;
    latestTodayCountRef.current = nextCount;
    data.setTodayCount(nextCount);
    setTypedToday(String(nextCount));
  }

  function handleTodayTextChange(value: string) {
    const digitsOnly = value.replace(/\D/g, '');
    setTypedToday(digitsOnly);

    if (digitsOnly) {
      const nextCount = Number.parseInt(digitsOnly, 10);
      latestTodayCountRef.current = nextCount;
      data.setTodayCount(nextCount);
    }
  }

  const statCards = [
    {
      label: 'Total applications',
      value: stats.total.toLocaleString(),
      detail: `${stats.activeDays} active days`,
      icon: Briefcase,
    },
    {
      label: 'Applied today',
      value: stats.today.toLocaleString(),
      detail: `Goal pace ${stats.today >= 8 ? 'met' : 'in progress'}`,
      icon: CalendarCheck,
    },
    {
      label: 'Daily average',
      value: stats.averagePerDay.toFixed(1),
      detail: `Best day ${stats.bestDay}`,
      icon: TrendingUp,
    },
  ];

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <MutedText style={styles.eyebrow}>Private job search command center</MutedText>
          <AppText style={[styles.title, isNarrow && styles.titleCompact]}>
            Keep your applications moving every day.
          </AppText>
          <MutedText style={styles.subtitle}>
            Track daily applications, protect the streak, and keep the next follow-up visible.
          </MutedText>
        </View>
        <Card style={[styles.todayCard, isNarrow && styles.todayCardCompact]}>
          <MutedText style={styles.todayLabel}>Today</MutedText>
          <AppText style={styles.todayValue}>{stats.today}</AppText>
          <MutedText style={styles.todayMeta}>{data.today}</MutedText>
        </Card>
      </View>

      {data.notice ? (
        <Notice kind={data.notice.kind} message={data.notice.message} onDismiss={data.clearNotice} />
      ) : null}

      <View style={[styles.statsGrid, width >= 860 && styles.statsGridWide]}>
        {statCards.map((item) => (
          <Card key={item.label} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.primarySoft }]}>
              <item.icon size={20} color={colors.primary} strokeWidth={2.4} />
            </View>
            <MutedText style={styles.statLabel}>{item.label}</MutedText>
            <AppText style={styles.statValue}>{item.value}</AppText>
            <MutedText style={styles.statDetail}>{item.detail}</MutedText>
          </Card>
        ))}
      </View>

      <Card style={styles.heatmapCard}>
        <SectionHeader
          title="Application Activity"
          subtitle="A daily record of applications submitted in your profile timezone."
          action={
            <SegmentedControl value={data.rangeMonths} options={rangeOptions} onChange={data.setRangeMonths} />
          }
        />
        <ActivityHeatmap counts={data.counts} endDate={data.today} months={data.rangeMonths} />
      </Card>

      <Card style={styles.counterCard}>
        <View style={styles.counterCopy}>
          <MutedText style={styles.eyebrow}>Today-only counter</MutedText>
          <AppText style={styles.counterTitle}>Log applications for {data.today}</AppText>
          <MutedText style={styles.counterSubtitle}>
            Previous days stay locked. Corrections are only allowed for the current local day.
          </MutedText>
        </View>
        <View style={styles.counterActions}>
          <IconButton
            icon={Minus}
            label="Decrease today's applications"
            tone="danger"
            disabled={stats.today <= 0}
            onPressIn={() => startRepeatingCounter(-1)}
            onPressOut={stopRepeatingCounter}
            onPress={() => handleCounterPress(-1)}
          />
          <TextField
            accessibilityLabel="Today's application count"
            value={typedToday}
            onChangeText={handleTodayTextChange}
            onBlur={() => commitTypedToday()}
            onSubmitEditing={() => commitTypedToday()}
            keyboardType="number-pad"
            selectTextOnFocus
            style={[
              styles.counterInput,
              { backgroundColor: colors.surfaceSoft, borderColor: colors.border },
            ]}
          />
          <IconButton
            icon={Plus}
            label="Increase today's applications"
            tone="primary"
            onPressIn={() => startRepeatingCounter(1)}
            onPressOut={stopRepeatingCounter}
            onPress={() => handleCounterPress(1)}
          />
        </View>
        <Button title="Add one application" icon={Plus} onPress={() => data.adjustTodayCount(1)} />
      </Card>

      <TaskActivitySection />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  heroCopy: {
    flex: 1,
    minWidth: 280,
    gap: spacing.sm,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    maxWidth: 720,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '900',
  },
  titleCompact: {
    fontSize: 32,
    lineHeight: 38,
  },
  subtitle: {
    maxWidth: 640,
    fontSize: 16,
    lineHeight: 24,
  },
  todayCard: {
    minWidth: 180,
    justifyContent: 'space-between',
  },
  todayCardCompact: {
    width: '100%',
  },
  todayLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  todayValue: {
    fontSize: 54,
    lineHeight: 58,
    fontWeight: '900',
  },
  todayMeta: {
    fontSize: 13,
    fontWeight: '700',
  },
  statsGrid: {
    gap: spacing.md,
  },
  statsGridWide: {
    flexDirection: 'row',
  },
  statCard: {
    flex: 1,
    minWidth: 210,
    gap: spacing.sm,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  statValue: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '900',
  },
  statDetail: {
    fontSize: 13,
    fontWeight: '700',
  },
  heatmapCard: {
    gap: spacing.xl,
  },
  counterCard: {
    gap: spacing.lg,
  },
  counterCopy: {
    gap: spacing.xs,
  },
  counterTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  counterSubtitle: {
    maxWidth: 680,
    fontSize: 14,
    lineHeight: 20,
  },
  counterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  counterInput: {
    minWidth: 86,
    height: 54,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
});
