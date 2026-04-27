import { Check, Mail, Search, UserPlus, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

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
  TextField,
} from '@/src/components/ui';
import { getApplicationStats } from '@/src/lib/stats';
import { spacing } from '@/src/theme/tokens';
import { useTheme } from '@/src/theme/useTheme';
import { useAppData } from '@/src/providers/AppDataProvider';
import type { Profile } from '@/src/types/domain';

export function FriendsScreen() {
  const data = useAppData();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<Profile | null>(null);
  const [message, setMessage] = useState('');

  const rankedFriends = useMemo(
    () =>
      data.friends.map((friend) => ({
        ...friend,
        stats: getApplicationStats(friend.counts, data.today, friend.profile.trackingStartedOn),
      })),
    [data.friends, data.today],
  );

  if (data.isLoading) return <LoadingState />;

  return (
    <Screen>
      <SectionHeader
        title="Friends"
        subtitle="Accepted friends can see exact application counts, totals, and activity heatmaps."
      />

      <Card style={styles.searchCard}>
        <View style={styles.searchHeader}>
          <View style={[styles.iconBadge, { backgroundColor: colors.primarySoft }]}>
            <UserPlus size={20} color={colors.primary} strokeWidth={2.4} />
          </View>
          <View style={styles.searchCopy}>
            <AppText style={styles.cardTitle}>Add by email</AppText>
            <MutedText style={styles.cardSubtitle}>
              Search exact email addresses. Requests must be accepted before activity is shared.
            </MutedText>
          </View>
        </View>
        <View style={styles.searchRow}>
          <TextField
            value={email}
            onChangeText={setEmail}
            placeholder="friend@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.searchInput}
          />
          <Button
            title="Search"
            icon={Search}
            variant="secondary"
            onPress={async () => {
              const found = await data.searchFriendByEmail(email);
              setResult(found);
              setMessage(found ? '' : 'No profile found for that email.');
            }}
          />
        </View>

        {result ? (
          <View style={[styles.resultRow, { borderColor: colors.border }]}>
            <View style={styles.avatar}>
              <AppText style={styles.avatarText}>{result.displayName.slice(0, 1).toUpperCase()}</AppText>
            </View>
            <View style={styles.resultText}>
              <AppText style={styles.resultName}>{result.displayName}</AppText>
              <MutedText style={styles.resultEmail}>{result.email}</MutedText>
            </View>
            <Button
              title="Send request"
              icon={Mail}
              onPress={() => {
                data.sendFriendRequest(result);
                setMessage('Friend request queued.');
              }}
            />
          </View>
        ) : null}
        {message ? <MutedText style={styles.message}>{message}</MutedText> : null}
      </Card>

      {data.friendRequests.length > 0 ? (
        <Card style={styles.requestsCard}>
          <SectionHeader title="Requests" subtitle="Incoming requests need your approval." />
          {data.friendRequests.map((request) => (
            <View key={request.id} style={[styles.requestRow, { borderColor: colors.border }]}>
              <View style={styles.avatar}>
                <AppText style={styles.avatarText}>
                  {request.profile.displayName.slice(0, 1).toUpperCase()}
                </AppText>
              </View>
              <View style={styles.resultText}>
                <AppText style={styles.resultName}>{request.profile.displayName}</AppText>
                <MutedText style={styles.resultEmail}>
                  {request.direction === 'incoming' ? 'Incoming' : 'Outgoing'} - {request.profile.email}
                </MutedText>
              </View>
              {request.direction === 'incoming' ? (
                <View style={styles.requestActions}>
                  <IconButton
                    icon={Check}
                    label="Accept request"
                    tone="primary"
                    onPress={() => data.respondToFriendRequest(request.id, 'accepted')}
                  />
                  <IconButton
                    icon={X}
                    label="Decline request"
                    tone="danger"
                    onPress={() => data.respondToFriendRequest(request.id, 'declined')}
                  />
                </View>
              ) : (
                <MutedText style={styles.pendingText}>Pending</MutedText>
              )}
            </View>
          ))}
        </Card>
      ) : null}

      <View style={styles.friendList}>
        {rankedFriends.map((friend) => (
          <Card key={friend.id} style={styles.friendCard}>
            <View style={styles.friendHeader}>
              <View style={styles.friendIdentity}>
                <View style={styles.avatar}>
                  <AppText style={styles.avatarText}>
                    {friend.profile.displayName.slice(0, 1).toUpperCase()}
                  </AppText>
                </View>
                <View>
                  <AppText style={styles.friendName}>{friend.profile.displayName}</AppText>
                  <MutedText style={styles.resultEmail}>{friend.profile.email}</MutedText>
                </View>
              </View>
              <View style={styles.friendStats}>
                <AppText style={styles.friendTotal}>{friend.stats.total}</AppText>
                <MutedText style={styles.friendStatLabel}>total</MutedText>
              </View>
              <View style={styles.friendStats}>
                <AppText style={styles.friendTotal}>{friend.stats.today}</AppText>
                <MutedText style={styles.friendStatLabel}>today</MutedText>
              </View>
              <View style={styles.friendStats}>
                <AppText style={styles.friendTotal}>{friend.stats.averagePerDay.toFixed(1)}</AppText>
                <MutedText style={styles.friendStatLabel}>avg/day</MutedText>
              </View>
            </View>
            <ActivityHeatmap counts={friend.counts} endDate={data.today} months={3} compact />
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchCard: {
    gap: spacing.lg,
  },
  searchHeader: {
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
  searchCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  searchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  searchInput: {
    flex: 1,
    minWidth: 240,
  },
  resultRow: {
    borderTopWidth: 1,
    paddingTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#dcebe0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
  },
  resultText: {
    flex: 1,
    minWidth: 180,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '900',
  },
  resultEmail: {
    fontSize: 13,
    fontWeight: '700',
  },
  message: {
    fontSize: 13,
    fontWeight: '700',
  },
  requestsCard: {
    gap: spacing.lg,
  },
  requestRow: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pendingText: {
    fontSize: 13,
    fontWeight: '800',
  },
  friendList: {
    gap: spacing.md,
  },
  friendCard: {
    gap: spacing.lg,
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  friendIdentity: {
    flex: 1,
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  friendName: {
    fontSize: 17,
    fontWeight: '900',
  },
  friendStats: {
    minWidth: 70,
  },
  friendTotal: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'right',
  },
  friendStatLabel: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
});
