import { Briefcase, CalendarCheck, Minus, Plus, TrendingUp } from 'lucide-react-native';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ActivityHeatmap } from '@/src/components/ActivityHeatmap';
import {
  AppText,
  Button,
  Card,
  IconButton,
  LoadingState,
  MutedText,
  Screen,
  SectionHeader,
  SegmentedControl,
} from '@/src/components/ui';
import { getApplicationStats } from '@/src/lib/stats';
import { spacing } from '@/src/theme/tokens';
import { useTheme } from '@/src/theme/useTheme';
import { useAppData } from '@/src/providers/AppDataProvider';
import type { RangeMonths } from '@/src/types/domain';

const rangeOptions: { label: string; value: RangeMonths }[] = [
  { label: '3M', value: 3 },
  { label: '6M', value: 6 },
  { label: '12M', value: 12 },
];

export function HomeScreen() {
  const data = useAppData();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  if (data.isLoading) return <LoadingState />;

  const stats = getApplicationStats(data.counts, data.today, data.profile.trackingStartedOn);
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
          <AppText style={styles.title}>Keep your applications moving every day.</AppText>
          <MutedText style={styles.subtitle}>
            Track daily applications, protect the streak, and keep the next follow-up visible.
          </MutedText>
        </View>
        <Card style={styles.todayCard}>
          <MutedText style={styles.todayLabel}>Today</MutedText>
          <AppText style={styles.todayValue}>{stats.today}</AppText>
          <MutedText style={styles.todayMeta}>{data.today}</MutedText>
        </Card>
      </View>

      <View style={[styles.statsGrid, width >= 780 && styles.statsGridWide]}>
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
            onPress={() => data.adjustTodayCount(-1)}
          />
          <View style={[styles.counterValue, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
            <AppText style={styles.counterNumber}>{stats.today}</AppText>
          </View>
          <IconButton
            icon={Plus}
            label="Increase today's applications"
            tone="primary"
            onPress={() => data.adjustTodayCount(1)}
          />
        </View>
        <Button title="Add one application" icon={Plus} onPress={() => data.adjustTodayCount(1)} />
      </Card>
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
  subtitle: {
    maxWidth: 640,
    fontSize: 16,
    lineHeight: 24,
  },
  todayCard: {
    minWidth: 180,
    justifyContent: 'space-between',
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
    gap: spacing.md,
  },
  counterValue: {
    minWidth: 86,
    height: 54,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterNumber: {
    fontSize: 26,
    fontWeight: '900',
  },
});
