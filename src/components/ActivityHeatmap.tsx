import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { addDays, enumerateDateKeys, monthLabel, startOfHeatmapWeek, subtractMonths } from '@/src/lib/dates';
import { countByDate, heatmapLevel } from '@/src/lib/stats';
import { spacing } from '@/src/theme/tokens';
import { useTheme } from '@/src/theme/useTheme';
import type { DailyApplicationCount, ISODate, RangeMonths } from '@/src/types/domain';

import { AppText, MutedText } from './ui';

type HeatmapDay = {
  date: ISODate;
  count: number;
  isFuture: boolean;
};

export function ActivityHeatmap({
  counts,
  endDate,
  months,
  compact = false,
}: {
  counts: DailyApplicationCount[];
  endDate: ISODate;
  months: RangeMonths;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<HeatmapDay | null>(null);
  const map = useMemo(() => countByDate(counts), [counts]);

  const startDate = useMemo(() => startOfHeatmapWeek(subtractMonths(endDate, months)), [endDate, months]);
  const days = useMemo(() => enumerateDateKeys(startDate, addDays(endDate, 6)), [endDate, startDate]);
  const weeks = useMemo(() => {
    const result: HeatmapDay[][] = [];
    for (let index = 0; index < days.length; index += 7) {
      result.push(
        days.slice(index, index + 7).map((date) => ({
          date,
          count: map[date] ?? 0,
          isFuture: date > endDate,
        })),
      );
    }
    return result;
  }, [days, endDate, map]);

  const cellSize = compact || width < 520 ? 12 : 15;
  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    weeks.forEach((week, weekIndex) => {
      const firstDay = week[0]?.date;
      if (!firstDay) return;
      const dayOfMonth = firstDay.slice(8, 10);
      if (dayOfMonth <= '07') {
        labels.push({ label: monthLabel(firstDay), weekIndex });
      }
    });
    return labels;
  }, [weeks]);
  const selectedDay = selected ?? {
    date: endDate,
    count: map[endDate] ?? 0,
    isFuture: false,
  };
  const selectedLevel = heatmapLevel(selectedDay.count);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {!compact ? (
            <View style={[styles.monthRow, { marginLeft: 34 }]}>
              {monthLabels.map((item) => (
                <MutedText
                  key={`${item.label}-${item.weekIndex}`}
                  style={[
                    styles.monthLabel,
                    {
                      left: item.weekIndex * (cellSize + 4),
                    },
                  ]}
                >
                  {item.label}
                </MutedText>
              ))}
            </View>
          ) : null}

          <View style={styles.gridRow}>
            {!compact ? (
              <View style={styles.weekdayLabels}>
                <MutedText style={styles.weekday}>Mon</MutedText>
                <MutedText style={styles.weekday}>Wed</MutedText>
                <MutedText style={styles.weekday}>Fri</MutedText>
              </View>
            ) : null}
            <View style={styles.weeks}>
              {weeks.map((week, weekIndex) => (
                <View key={`week-${weekIndex}`} style={styles.week}>
                  {week.map((day) => {
                    const level = day.isFuture ? 0 : heatmapLevel(day.count);
                    return (
                      <Pressable
                        key={day.date}
                        accessibilityLabel={`${day.count} applications on ${day.date}`}
                        disabled={day.isFuture}
                        onPress={() => setSelected(day)}
                        onHoverIn={() => setSelected(day)}
                        style={[
                          styles.cell,
                          {
                            width: cellSize,
                            height: cellSize,
                            backgroundColor: day.isFuture ? 'transparent' : colors.heatmap[level],
                            borderColor: colors.border,
                            opacity: day.isFuture ? 0 : 1,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {!compact ? (
        <View
          style={[
            styles.detailStrip,
            {
              backgroundColor: colors.surfaceSoft,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.detailSwatch,
              {
                backgroundColor: colors.heatmap[selectedLevel],
                borderColor: colors.border,
              },
            ]}
          />
          <View style={styles.detailCopy}>
            <AppText style={styles.detailTitle}>{selectedDay.date}</AppText>
            <MutedText style={styles.detailText}>
              {selectedDay.count === 1
                ? '1 application'
                : `${selectedDay.count} applications`}{' '}
              - {heatmapIntensityLabel(selectedDay.count)}
            </MutedText>
          </View>
        </View>
      ) : null}

      <View style={styles.legendRow}>
        <MutedText style={styles.legendText}>Less</MutedText>
        <View style={styles.legendCells}>
          {colors.heatmap.map((color, index) => (
            <View
              key={color}
              style={[
                styles.legendCell,
                {
                  backgroundColor: color,
                  borderColor: colors.border,
                  width: cellSize,
                  height: cellSize,
                },
              ]}
              accessibilityLabel={`Heatmap level ${index}`}
            />
          ))}
        </View>
        <AppText style={[styles.legendText, { color: colors.muted }]}>More</AppText>
      </View>
    </View>
  );
}

function heatmapIntensityLabel(count: number) {
  if (count <= 0) return 'No activity';
  if (count <= 2) return 'Light activity';
  if (count <= 5) return 'Steady activity';
  if (count <= 9) return 'Strong activity';
  if (count <= 20) return 'High output';
  if (count <= 30) return 'Excellent output';
  return 'Peak output';
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  monthRow: {
    height: 22,
    position: 'relative',
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '700',
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  weekdayLabels: {
    width: 26,
    paddingTop: 18,
    gap: 11,
  },
  weekday: {
    fontSize: 11,
    fontWeight: '700',
  },
  weeks: {
    flexDirection: 'row',
    gap: 4,
  },
  week: {
    gap: 4,
  },
  cell: {
    borderRadius: 3,
    borderWidth: 1,
  },
  detailStrip: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailSwatch: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
  },
  detailCopy: {
    flex: 1,
    gap: 2,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  detailText: {
    fontSize: 13,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  legendCells: {
    flexDirection: 'row',
    gap: 4,
  },
  legendCell: {
    borderRadius: 3,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
