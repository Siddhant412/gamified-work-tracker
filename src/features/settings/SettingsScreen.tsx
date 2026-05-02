import { Clock, LogOut, Save, Shield, User } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  LoadingState,
  MutedText,
  Notice,
  Screen,
  SectionHeader,
  TextField,
} from '@/src/components/ui';
import { isSupabaseConfigured } from '@/src/config/env';
import { nativeOAuthRedirectUrl } from '@/src/lib/authRedirect';
import { getDeviceTimezone } from '@/src/lib/dates';
import { isValidTimezone, normalizeTimezone, suggestedTimezones } from '@/src/lib/timezones';
import { useAppData } from '@/src/providers/AppDataProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { spacing } from '@/src/theme/tokens';
import { useTheme } from '@/src/theme/useTheme';

export function SettingsScreen() {
  const auth = useAuth();
  const data = useAppData();
  const { colors } = useTheme();
  const [displayName, setDisplayName] = useState(data.profile.displayName);
  const [timezone, setTimezone] = useState(data.profile.timezone);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDisplayName(data.profile.displayName);
    setTimezone(data.profile.timezone);
  }, [data.profile.displayName, data.profile.timezone]);

  const trimmedDisplayName = displayName.trim();
  const normalizedTimezone = normalizeTimezone(timezone);
  const timezoneIsValid = isValidTimezone(normalizedTimezone);
  const deviceTimezone = useMemo(() => getDeviceTimezone(), []);
  const hasChanges =
    trimmedDisplayName !== data.profile.displayName || normalizedTimezone !== data.profile.timezone;

  if (data.isLoading) return <LoadingState />;

  async function saveProfile() {
    if (!trimmedDisplayName || !timezoneIsValid || !hasChanges) return;

    setIsSaving(true);
    await data.updateProfile({
      displayName: trimmedDisplayName,
      timezone: normalizedTimezone,
    });
    setIsSaving(false);
  }

  return (
    <Screen>
      <SectionHeader
        title="Settings"
        subtitle="Profile, timezone, privacy, and environment state for this private MVP."
      />

      {data.notice ? (
        <Notice kind={data.notice.kind} message={data.notice.message} onDismiss={data.clearNotice} />
      ) : null}

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

        <View style={styles.form}>
          <TextField
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Display name"
            autoCapitalize="words"
          />
          <View style={styles.timezoneRow}>
            <TextField
              value={timezone}
              onChangeText={setTimezone}
              placeholder="Timezone"
              autoCapitalize="none"
              style={styles.timezoneInput}
            />
            <Button
              title="Device"
              icon={Clock}
              variant="secondary"
              onPress={() => setTimezone(deviceTimezone)}
            />
          </View>
          {!trimmedDisplayName ? (
            <MutedText style={styles.validationText}>Display name is required.</MutedText>
          ) : null}
          {!timezoneIsValid ? (
            <MutedText style={styles.validationText}>Enter a valid IANA timezone.</MutedText>
          ) : null}
          <MutedText style={styles.policyText}>
            Timezone controls which local date receives today&apos;s application count. Changing it
            affects current and future logging only; existing activity dates are not rewritten.
          </MutedText>
          <View style={styles.suggestions}>
            {suggestedTimezones.map((item) => (
              <Button
                key={item}
                title={item.replace('America/', '').replace('Europe/', '').replace('Asia/', '')}
                variant={normalizedTimezone === item ? 'secondary' : 'ghost'}
                onPress={() => setTimezone(item)}
                style={styles.suggestionButton}
              />
            ))}
          </View>
          <Button
            title="Save profile"
            icon={Save}
            disabled={!trimmedDisplayName || !timezoneIsValid || !hasChanges}
            loading={isSaving}
            onPress={saveProfile}
          />
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
          <View style={[styles.metaBox, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
            <MutedText style={styles.metaLabel}>iOS OAuth redirect</MutedText>
            <AppText style={styles.metaValue}>{nativeOAuthRedirectUrl}</AppText>
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
  form: {
    gap: spacing.md,
  },
  timezoneRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  timezoneInput: {
    flex: 1,
    minWidth: 240,
  },
  validationText: {
    fontSize: 12,
    fontWeight: '800',
  },
  policyText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  suggestionButton: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
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
