import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../services/api';
import { colors, fonts, radius, spacing } from '../../../constants/theme';

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [currentUserStanding, setCurrentUserStanding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      const data = await api.getLeaderboard();
      setLeaders(data.leaderboard || []);
      setCurrentUserStanding(data.currentUser || null);
    } catch (err) {
      console.warn('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const top1 = leaders[0];
  const top2 = leaders[1];
  const top3 = leaders[2];
  const remaining = leaders.slice(3);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: 110 + insets.bottom },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <Text style={styles.headerSubtitle}>Weekly XP rankings · Resets every Monday</Text>
        </View>

        {/* Podium for Top 3 */}
        {leaders.length > 0 && (
          <View style={styles.podiumContainer}>
            {/* Rank 2 (Silver) */}
            <View style={styles.podiumCol}>
              {top2 ? (
                <>
                  <View style={[styles.avatarCircle, { borderColor: colors.silver }]}>
                    <Text style={styles.avatarInitial}>
                      {top2.display_name?.charAt(0) || '2'}
                    </Text>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>{top2.display_name}</Text>
                  <Text style={styles.podiumXp}>{top2.weekly_xp} XP</Text>
                  <View style={[styles.podiumStep, styles.stepSilver]}>
                    <Text style={styles.podiumRankNum}>2</Text>
                  </View>
                </>
              ) : null}
            </View>

            {/* Rank 1 (Gold) */}
            <View style={[styles.podiumCol, styles.podiumCenterCol]}>
              {top1 ? (
                <>
                  <Ionicons name="trophy" size={24} color={colors.gold} style={{ marginBottom: 2 }} />
                  <View style={[styles.avatarCircle, styles.goldAvatar]}>
                    <Text style={styles.avatarInitial}>
                      {top1.display_name?.charAt(0) || '1'}
                    </Text>
                  </View>
                  <Text style={[styles.podiumName, styles.goldName]} numberOfLines={1}>
                    {top1.display_name}
                  </Text>
                  <Text style={styles.podiumXp}>{top1.weekly_xp} XP</Text>
                  <View style={[styles.podiumStep, styles.stepGold]}>
                    <Text style={styles.podiumRankNum}>1</Text>
                  </View>
                </>
              ) : null}
            </View>

            {/* Rank 3 (Bronze) */}
            <View style={styles.podiumCol}>
              {top3 ? (
                <>
                  <View style={[styles.avatarCircle, { borderColor: colors.bronze }]}>
                    <Text style={styles.avatarInitial}>
                      {top3.display_name?.charAt(0) || '3'}
                    </Text>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>{top3.display_name}</Text>
                  <Text style={styles.podiumXp}>{top3.weekly_xp} XP</Text>
                  <View style={[styles.podiumStep, styles.stepBronze]}>
                    <Text style={styles.podiumRankNum}>3</Text>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        )}

        {/* User Standing Sticky Highlight */}
        {currentUserStanding && (
          <View style={styles.currentUserCard}>
            <View style={styles.userRankBadge}>
              <Text style={styles.userRankText}>#{currentUserStanding.rank}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userLabel}>YOUR CURRENT STANDING</Text>
              <Text style={styles.userName}>{currentUserStanding.display_name} (You)</Text>
            </View>
            <Text style={styles.userXp}>{currentUserStanding.weekly_xp} XP</Text>
          </View>
        )}

        {/* Remaining List 4-10 */}
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Top 10 Readers</Text>
          {remaining.length === 0 && leaders.length <= 3 ? (
            <Text style={styles.emptyNote}>Keep reading to rank higher on the board!</Text>
          ) : (
            remaining.map((item) => (
              <View key={item.id} style={styles.listItem}>
                <Text style={styles.listRank}>#{item.rank}</Text>
                <View style={styles.listAvatar}>
                  <Text style={styles.listAvatarText}>
                    {item.display_name?.charAt(0) || 'R'}
                  </Text>
                </View>
                <Text style={styles.listName} numberOfLines={1}>
                  {item.display_name}
                </Text>
                <Text style={styles.listXp}>{item.weekly_xp} XP</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  podiumCol: {
    flex: 1,
    alignItems: 'center',
  },
  podiumCenterCol: {
    marginBottom: 0,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 4,
  },
  goldAvatar: {
    width: 52,
    height: 52,
    borderColor: colors.gold,
    borderWidth: 2.5,
  },
  avatarInitial: {
    fontFamily: fonts.subheading,
    fontSize: 16,
    color: colors.ink,
  },
  podiumName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 2,
  },
  goldName: {
    fontFamily: fonts.subheading,
    fontSize: 13,
  },
  podiumXp: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.accent,
    marginBottom: 6,
  },
  podiumStep: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
  },
  stepGold: {
    height: 90,
    backgroundColor: '#E6D7A8',
  },
  stepSilver: {
    height: 65,
    backgroundColor: '#D9D9D9',
  },
  stepBronze: {
    height: 45,
    backgroundColor: '#D6C0B0',
  },
  podiumRankNum: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
  },
  currentUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSubtle,
    borderWidth: 1.5,
    borderColor: colors.accentLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  userRankBadge: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  userRankText: {
    fontFamily: fonts.subheading,
    fontSize: 14,
    color: colors.white,
  },
  userInfo: {
    flex: 1,
  },
  userLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 0.5,
  },
  userName: {
    fontFamily: fonts.subheading,
    fontSize: 15,
    color: colors.ink,
    marginTop: 2,
  },
  userXp: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.accent,
  },
  listContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  listTitle: {
    fontFamily: fonts.subheading,
    fontSize: 15,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  listRank: {
    width: 30,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.inkSecondary,
  },
  listAvatar: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceActive,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  listAvatarText: {
    fontFamily: fonts.subheading,
    fontSize: 12,
    color: colors.ink,
  },
  listName: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },
  listXp: {
    fontFamily: fonts.subheading,
    fontSize: 13,
    color: colors.accent,
  },
  emptyNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSecondary,
    fontStyle: 'italic',
    paddingVertical: spacing.sm,
  },
});
