import { BriefcaseBusiness, LogIn, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, MutedText, Screen } from '@/src/components/ui';
import { isSupabaseConfigured } from '@/src/config/env';
import { useAuth } from '@/src/providers/AuthProvider';
import { spacing } from '@/src/theme/tokens';
import { useTheme } from '@/src/theme/useTheme';

export function SignInScreen() {
  const auth = useAuth();
  const { colors } = useTheme();

  return (
    <Screen scroll={false} style={styles.screen}>
      <View style={styles.shell}>
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <BriefcaseBusiness size={26} color="#ffffff" strokeWidth={2.5} />
          </View>
          <AppText style={styles.product}>ApplyLoop</AppText>
        </View>
        <View style={styles.copy}>
          <MutedText style={styles.eyebrow}>Gamified job search tracker</MutedText>
          <AppText style={styles.title}>Make daily applications visible.</AppText>
          <MutedText style={styles.subtitle}>
            Sign in to track your counts, compare activity with accepted friends, and manage the
            tasks that keep your job search moving.
          </MutedText>
        </View>
        <Card style={styles.authCard}>
          <Button title="Continue with Google" icon={LogIn} onPress={auth.signInWithGoogle} />
          {!isSupabaseConfigured ? (
            <Button
              title="Continue local preview"
              variant="secondary"
              icon={ShieldCheck}
              onPress={auth.continueInDemoMode}
            />
          ) : null}
          <MutedText style={styles.helper}>
            {isSupabaseConfigured
              ? 'Google authentication is handled by Supabase Auth.'
              : 'Supabase env values are not configured yet, so this build opens with local preview data.'}
          </MutedText>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center',
  },
  shell: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: spacing.xl,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  product: {
    fontSize: 22,
    fontWeight: '900',
  },
  copy: {
    gap: spacing.md,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  authCard: {
    gap: spacing.md,
  },
  helper: {
    fontSize: 13,
    lineHeight: 18,
  },
});
