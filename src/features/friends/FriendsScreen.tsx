import {
  Check,
  Mail,
  Search,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActivityHeatmap } from '@/src/components/ActivityHeatmap';
import {
  AppText,
  Button,
  Card,
  EmptyState,
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
import type { FriendActivity, ISODate, Profile, RangeMonths } from '@/src/types/domain';

const rangeOptions: { label: string; value: RangeMonths }[] = [
  { label: '3M', value: 3 },
  { label: '6M', value: 6 },
  { label: '12M', value: 12 },
];

type FriendWithStats = FriendActivity & {
  stats: ReturnType<typeof getApplicationStats>;
};

export function FriendsScreen() {
  const data = useAppData();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<Profile | null>(null);
  const [searchMessage, setSearchMessage] = useState<{
    kind: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [friendRange, setFriendRange] = useState<RangeMonths>(6);

  const rankedFriends = useMemo<FriendWithStats[]>(
    () =>
      data.friends
        .map((friend) => ({
          ...friend,
          stats: getApplicationStats(friend.counts, data.today, friend.profile.trackingStartedOn),
        }))
        .sort((left, right) => right.stats.total - left.stats.total),
    [data.friends, data.today],
  );

  const selectedFriend = useMemo(
    () => rankedFriends.find((friend) => friend.id === selectedFriendId) ?? rankedFriends[0],
    [rankedFriends, selectedFriendId],
  );

  const myStats = useMemo(
    () => getApplicationStats(data.counts, data.today, data.profile.trackingStartedOn),
    [data.counts, data.profile.trackingStartedOn, data.today],
  );

  useEffect(() => {
    if (!selectedFriendId && rankedFriends.length > 0) {
      setSelectedFriendId(rankedFriends[0].id);
    }

    if (selectedFriendId && !rankedFriends.some((friend) => friend.id === selectedFriendId)) {
      setSelectedFriendId(rankedFriends[0]?.id ?? null);
    }
  }, [rankedFriends, selectedFriendId]);

  if (data.isLoading) return <LoadingState />;

  const normalizedEmail = email.trim().toLowerCase();
  const existingFriend = result
    ? data.friends.find((friend) => friend.profile.id === result.id || friend.profile.email === result.email)
    : null;
  const existingRequest = result
    ? data.friendRequests.find(
        (request) => request.profile.id === result.id || request.profile.email === result.email,
      )
    : null;

  async function searchFriend() {
    if (!normalizedEmail) {
      setResult(null);
      setSearchMessage({ kind: 'error', message: 'Enter an email address.' });
      return;
    }

    setIsSearching(true);
    setSearchMessage(null);

    try {
      const found = await data.searchFriendByEmail(normalizedEmail);
      setResult(found);
      setSearchMessage(
        found ? null : { kind: 'error', message: 'No profile found for that email.' },
      );
    } catch {
      setResult(null);
      setSearchMessage({ kind: 'error', message: 'Search failed. Try again.' });
    } finally {
      setIsSearching(false);
    }
  }

  function sendRequest(profile: Profile) {
    data.sendFriendRequest(profile);
    setSearchMessage({ kind: 'success', message: 'Friend request queued.' });
    setResult(null);
    setEmail('');
  }

  return (
    <Screen>
      <SectionHeader
        title="Friends"
        subtitle="Accepted friends can see exact application counts, totals, and activity heatmaps."
      />

      {data.notice ? (
        <Notice kind={data.notice.kind} message={data.notice.message} onDismiss={data.clearNotice} />
      ) : null}

      <Card style={styles.searchCard}>
        <View style={styles.searchHeader}>
          <View style={[styles.iconBadge, { backgroundColor: colors.primarySoft }]}>
            <UserPlus size={20} color={colors.primary} strokeWidth={2.4} />
          </View>
          <View style={styles.searchCopy}>
            <AppText style={styles.cardTitle}>Add by email</AppText>
            <MutedText style={styles.cardSubtitle}>
              Requests must be accepted before activity is shared.
            </MutedText>
          </View>
        </View>
        <View style={styles.searchRow}>
          <TextField
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setResult(null);
              setSearchMessage(null);
            }}
            placeholder="friend@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            style={styles.searchInput}
          />
          <Button
            title="Search"
            icon={Search}
            variant="secondary"
            loading={isSearching}
            disabled={!email.trim()}
            onPress={searchFriend}
          />
        </View>

        {result ? (
          <View style={[styles.resultRow, { borderColor: colors.border }]}>
            <Avatar name={result.displayName} />
            <View style={styles.resultText}>
              <AppText style={styles.resultName}>{result.displayName}</AppText>
              <MutedText style={styles.resultEmail}>{result.email}</MutedText>
            </View>
            {existingFriend ? (
              <Button title="Already friends" icon={UserCheck} variant="secondary" disabled />
            ) : existingRequest ? (
              <Button title="Request pending" icon={Mail} variant="secondary" disabled />
            ) : (
              <Button title="Send request" icon={Mail} onPress={() => sendRequest(result)} />
            )}
          </View>
        ) : null}

        {searchMessage ? <Notice kind={searchMessage.kind} message={searchMessage.message} /> : null}
      </Card>

      {data.friendRequests.length > 0 ? (
        <Card style={styles.requestsCard}>
          <SectionHeader title="Requests" subtitle="Incoming requests need your approval." />
          {data.friendRequests.map((request) => (
            <View key={request.id} style={[styles.requestRow, { borderColor: colors.border }]}>
              <Avatar name={request.profile.displayName} />
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

      {selectedFriend ? (
        <FriendDetail
          friend={selectedFriend}
          myStats={myStats}
          today={data.today}
          range={friendRange}
          onRangeChange={setFriendRange}
        />
      ) : (
        <EmptyState
          icon={Users}
          title="No friends yet"
          description="Accepted friends will appear here with their exact application activity."
        />
      )}

      <View style={styles.friendList}>
        <SectionHeader
          title="Activity Feed"
          subtitle={`${rankedFriends.length} accepted ${rankedFriends.length === 1 ? 'friend' : 'friends'}`}
        />
        {rankedFriends.length > 0 ? (
          rankedFriends.map((friend) => (
            <FriendSummaryCard
              key={friend.id}
              friend={friend}
              today={data.today}
              selected={friend.id === selectedFriend?.id}
              onSelect={() => setSelectedFriendId(friend.id)}
            />
          ))
        ) : (
          <EmptyState
            icon={UserPlus}
            title="Start with email search"
            description="Search a profile by exact email and send a friend request."
          />
        )}
      </View>
    </Screen>
  );
}

function FriendDetail({
  friend,
  myStats,
  today,
  range,
  onRangeChange,
}: {
  friend: FriendWithStats;
  myStats: ReturnType<typeof getApplicationStats>;
  today: ISODate;
  range: RangeMonths;
  onRangeChange: (range: RangeMonths) => void;
}) {
  const { colors } = useTheme();

  return (
    <Card style={styles.detailCard}>
      <SectionHeader
        title="Friend Activity"
        subtitle={friend.profile.email}
        action={<SegmentedControl value={range} options={rangeOptions} onChange={onRangeChange} />}
      />
      <View style={styles.detailHeader}>
        <View style={styles.friendIdentity}>
          <Avatar name={friend.profile.displayName} large />
          <View>
            <AppText style={styles.detailName}>{friend.profile.displayName}</AppText>
            <MutedText style={styles.resultEmail}>
              Since {friend.profile.trackingStartedOn} - {friend.profile.timezone}
            </MutedText>
          </View>
        </View>
        <View style={[styles.compareBadge, { backgroundColor: colors.primarySoft }]}>
          <TrendingUp size={18} color={colors.primary} strokeWidth={2.4} />
          <AppText style={[styles.compareText, { color: colors.primary }]}>
            {friend.stats.today - myStats.today >= 0 ? '+' : ''}
            {friend.stats.today - myStats.today} today
          </AppText>
        </View>
      </View>

      <View style={styles.detailStats}>
        <StatPill label="Total" value={friend.stats.total.toLocaleString()} />
        <StatPill label="Today" value={friend.stats.today.toLocaleString()} />
        <StatPill label="Avg/day" value={friend.stats.averagePerDay.toFixed(1)} />
        <StatPill label="Streak" value={`${friend.stats.currentStreak}d`} />
        <StatPill label="Best" value={friend.stats.bestDay.toLocaleString()} />
      </View>

      <ActivityHeatmap counts={friend.counts} endDate={today} months={range} />
    </Card>
  );
}

function FriendSummaryCard({
  friend,
  today,
  selected,
  onSelect,
}: {
  friend: FriendWithStats;
  today: ISODate;
  selected: boolean;
  onSelect: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable accessibilityRole="button" onPress={onSelect}>
      <Card
        style={[
          styles.friendCard,
          {
            borderColor: selected ? colors.primary : colors.border,
            backgroundColor: selected ? colors.primarySoft : colors.surface,
          },
        ]}
      >
        <View style={styles.friendHeader}>
          <View style={styles.friendIdentity}>
            <Avatar name={friend.profile.displayName} />
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
            <AppText style={styles.friendTotal}>{friend.stats.currentStreak}</AppText>
            <MutedText style={styles.friendStatLabel}>streak</MutedText>
          </View>
        </View>
        <ActivityHeatmap
          counts={friend.counts}
          endDate={today}
          months={3}
          compact
        />
      </Card>
    </Pressable>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.statPill, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
      <AppText style={styles.statPillValue}>{value}</AppText>
      <MutedText style={styles.statPillLabel}>{label}</MutedText>
    </View>
  );
}

function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  const { colors } = useTheme();
  const initial = name.slice(0, 1).toUpperCase() || '?';

  return (
    <View
      style={[
        styles.avatar,
        large && styles.avatarLarge,
        { backgroundColor: colors.primarySoft, borderColor: colors.border },
      ]}
    >
      <AppText style={[styles.avatarText, large && styles.avatarTextLarge]}>{initial}</AppText>
    </View>
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLarge: {
    width: 56,
    height: 56,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
  },
  avatarTextLarge: {
    fontSize: 22,
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
  detailCard: {
    gap: spacing.xl,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  detailName: {
    fontSize: 24,
    fontWeight: '900',
  },
  compareBadge: {
    minHeight: 42,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compareText: {
    fontSize: 13,
    fontWeight: '900',
  },
  detailStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statPill: {
    flex: 1,
    minWidth: 110,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statPillValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  statPillLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
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
