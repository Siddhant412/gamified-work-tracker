import { LogOut, Shield, User } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, LoadingState, MutedText, Screen, SectionHeader } from '@/src/components/ui';
import { isSupabaseConfigured } from '@/src/config/env';
import { useAppData } from '@/src/providers/AppDataProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { spacing } from '@/src/theme/tokens';
import { useTheme } from '@/src/theme/useTheme';

export function SettingsScreen() {
  const auth = useAuth();
  const data = useAppData();
  const { colors } = useTheme();

  if (data.isLoading) return <LoadingState />;

  return (
    <Screen>
      <SectionHeader
        title="Settings"
        subtitle="Profile, timezone, privacy, and environment state for this private MVP."
      />

      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.iconBadge, { backgroundColor: colors.primarySoft }]}>
            <User size={20} color={colors.primary} strokeWidth={2.4} />
          </View>
          <View style={styles.copy}>
            <AppText style={styles.title}>{data.profile.displayName}</AppText>
            <MutedText style={styles.detail}>{auth.userEmail ?? data.profile.email}</MutedText>
          </View>
        </View>
        <View style={styles.metaGrid}>
          <View style={[styles.metaBox, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
            <MutedText style={styles.metaLabel}>Timezone</MutedText>
            <AppText style={styles.metaValue}>{data.profile.timezone}</AppText>
          </View>
          <View style={[styles.metaBox, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
            <MutedText style={styles.metaLabel}>Tracking since</MutedText>
            <AppText style={styles.metaValue}>{data.profile.trackingStartedOn}</AppText>
          </View>
          <View style={[styles.metaBox, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
            <MutedText style={styles.metaLabel}>Backend</MutedText>
            <AppText style={styles.metaValue}>
              {isSupabaseConfigured ? 'Supabase configured' : 'Local preview mode'}
            </AppText>
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.iconBadge, { backgroundColor: colors.successSoft }]}>
            <Shield size={20} color={colors.success} strokeWidth={2.4} />
          </View>
          <View style={styles.copy}>
            <AppText style={styles.title}>Privacy model</AppText>
            <MutedText style={styles.detail}>
              Tasks stay private. Accepted friends can see exact daily application counts, totals,
              averages, and activity heatmaps.
            </MutedText>
          </View>
        </View>
      </Card>

      <Button title="Sign out" icon={LogOut} variant="danger" onPress={auth.signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
  },
  detail: {
    fontSize: 14,
    lineHeight: 20,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metaBox: {
    flex: 1,
    minWidth: 190,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.xs,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '900',
  },
});
