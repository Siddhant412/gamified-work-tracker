import type { LucideIcon } from 'lucide-react-native';
import { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  PressableProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';

import { radii, spacing } from '@/src/theme/tokens';
import { useTheme } from '@/src/theme/useTheme';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function Screen({ children, scroll = true, style }: ScreenProps) {
  const { colors } = useTheme();
  const content = <View style={[styles.screenInner, style]}>{children}</View>;

  if (!scroll) {
    return <View style={[styles.screen, { backgroundColor: colors.canvas }]}>{content}</View>;
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.canvas }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  );
}

export function AppText({ style, ...props }: TextProps) {
  const { colors } = useTheme();
  return <Text {...props} style={[{ color: colors.ink }, style]} />;
}

export function MutedText({ style, ...props }: TextProps) {
  const { colors } = useTheme();
  return <Text {...props} style={[{ color: colors.muted }, style]} />;
}

export function Card({
  children,
  style,
  padded = true,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; padded?: boolean }>) {
  const { colors } = useTheme();
  const shadowStyle =
    Platform.OS === 'web'
      ? ({ boxShadow: `0 8px 24px ${colors.shadow}` } as ViewStyle)
      : ({
          shadowColor: colors.shadow,
          shadowOpacity: 1,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 24,
          elevation: 2,
        } satisfies ViewStyle);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        shadowStyle,
        padded && styles.cardPadded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

type ButtonProps = PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: LucideIcon;
  loading?: boolean;
};

export function Button({
  title,
  variant = 'primary',
  icon: Icon,
  loading,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = Boolean(disabled || loading);
  const palette = {
    primary: {
      bg: colors.primary,
      border: colors.primary,
      text: '#ffffff',
    },
    secondary: {
      bg: colors.primarySoft,
      border: colors.primarySoft,
      text: colors.primary,
    },
    ghost: {
      bg: 'transparent',
      border: colors.border,
      text: colors.ink,
    },
    danger: {
      bg: colors.dangerSoft,
      border: colors.dangerSoft,
      text: colors.danger,
    },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: isDisabled ? 0.55 : pressed ? 0.82 : 1,
        },
        style as ViewStyle,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <>
          {Icon ? <Icon size={17} color={palette.text} strokeWidth={2.3} /> : null}
          <Text style={[styles.buttonText, { color: palette.text }]} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

type IconButtonProps = PressableProps & {
  icon: LucideIcon;
  label: string;
  tone?: 'default' | 'primary' | 'danger';
};

export function IconButton({ icon: Icon, label, tone = 'default', disabled, style, ...props }: IconButtonProps) {
  const { colors } = useTheme();
  const color = tone === 'danger' ? colors.danger : tone === 'primary' ? colors.primary : colors.ink;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: tone === 'primary' ? colors.primarySoft : colors.surfaceSoft,
          borderColor: colors.border,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
        style as ViewStyle,
      ]}
      {...props}
    >
      <Icon size={20} color={color} strokeWidth={2.4} />
    </Pressable>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionText}>
        <AppText style={styles.sectionTitle}>{title}</AppText>
        {subtitle ? <MutedText style={styles.sectionSubtitle}>{subtitle}</MutedText> : null}
      </View>
      {action}
    </View>
  );
}

export function TextField(props: TextInputProps) {
  const { colors } = useTheme();

  return (
    <TextInput
      placeholderTextColor={colors.subtle}
      {...props}
      style={[
        styles.input,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          color: colors.ink,
        },
        props.style,
      ]}
    />
  );
}

export function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.segmented, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              selected && { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: selected ? colors.ink : colors.muted },
                selected && styles.segmentTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function LoadingState() {
  const { colors } = useTheme();

  return (
    <View style={[styles.loading, { backgroundColor: colors.canvas }]}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  screenInner: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  card: {
    borderWidth: 1,
    borderRadius: radii.md,
  },
  cardPadded: {
    padding: spacing.lg,
  },
  button: {
    minHeight: 44,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.lg,
  },
  sectionText: {
    flex: 1,
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: 3,
    gap: 3,
  },
  segment: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTextSelected: {
    fontWeight: '800',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
