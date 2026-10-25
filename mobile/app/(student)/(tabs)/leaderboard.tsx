import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
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
  const [filterMode, setFilterMode] = useState<'overall' | 'weekly'>('overall');

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

  const romanNumerals = ['I', 'II', 'III'];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.sm, paddingBottom: 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Header Context & Reset Strip */}
        <View style={styles.header}>
          <View style={styles.headerMetaRow}>
            <Text style={styles.headerMetaText}>SCHOLARLY READING CIRCLE</Text>
            <View style={styles.resetWrap}>
              <Ionicons name="time-outline" size={13} color={colors.inkSecondary} />
              <Text style={styles.resetText}>Resets Monday 00:00</Text>
            </View>
          </View>

          <Text style={styles.headerTitle}>Weekly Leaderboard</Text>
          <Text style={styles.headerSubtitle}>
            Continuous quiet focus among fellow bibliophiles and researchers.
          </Text>
        </View>

        {/* Current User Pinned Standing Card */}
        {currentUserStanding && (
          <View style={styles.userPinnedCard}>
            <View style={styles.userPinnedTop}>
              <View style={styles.userAvatarWrap}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarInitial}>
                    {(currentUserStanding.display_name || 'Y').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>YOU</Text>
                </View>
              </View>

              <View style={styles.userPinnedDetails}>
                <View style={styles.userRankRow}>
                  <Text style={styles.userPinnedName} numberOfLines={1}>
                    {currentUserStanding.display_name}
                  </Text>
                  <Text style={styles.userRankNumber}>#{currentUserStanding.rank || 1}</Text>
                </View>
                <Text style={styles.userSubtext}>Active in scholarly circle</Text>
              </View>

              <View style={styles.userPinnedXpWrap}>
                <Text style={styles.userPinnedXp}>
                  {currentUserStanding.weekly_xp || 0}{' '}
                  <Text style={styles.userPinnedXpUnit}>XP</Text>
                </Text>
                <View style={styles.streakBadge}>
                  <Ionicons name="flame" size={12} color={colors.secondary} />
                  <Text style={styles.streakText}>
                    {currentUserStanding.streak || 1}d Streak
                  </Text>
                </View>
              </View>
            </View>

            {/* Pacing Telemetry Strip */}
            <View style={styles.telemetryStrip}>
              <View style={styles.telemetryCol}>
                <Text style={styles.telemetryLabel}>CYCLE XP</Text>
                <Text style={styles.telemetryValue}>{currentUserStanding.weekly_xp || 0} pts</Text>
              </View>
              <View style={styles.telemetryDivider} />
              <View style={styles.telemetryCol}>
                <Text style={styles.telemetryLabel}>ACTIVE RANK</Text>
                <Text style={styles.telemetryValue}>Top #{currentUserStanding.rank || 1}</Text>
              </View>
              <View style={styles.telemetryDivider} />
              <View style={styles.telemetryCol}>
                <Text style={styles.telemetryLabel}>TARGET</Text>
                <Text style={[styles.telemetryValue, { color: colors.accent }]}>Next Tier</Text>
              </View>
            </View>
          </View>
        )}

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <View style={styles.filterGroup}>
            <TouchableOpacity
              style={[styles.filterBtn, filterMode === 'overall' && styles.filterBtnActive]}
              onPress={() => setFilterMode('overall')}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  filterMode === 'overall' && styles.filterBtnTextActive,
                ]}
              >
                Overall Circle
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterBtn, filterMode === 'weekly' && styles.filterBtnActive]}
              onPress={() => setFilterMode('weekly')}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  filterMode === 'weekly' && styles.filterBtnTextActive,
                ]}
              >
                Weekly Sprint
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.activeScholarsText}>
            {leaders.length} Active Readers
          </Text>
        </View>

        {/* Archival Ledger Table */}
        <View style={styles.ledgerTable}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.colOrd}>ORD.</Text>
            <Text style={styles.colScholar}>SCHOLAR</Text>
            <Text style={styles.colXp}>CONTRIBUTION</Text>
          </View>

          {leaders.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="trophy-outline" size={36} color={colors.outline} />
              <Text style={styles.emptyText}>The current ledger is awaiting submissions.</Text>
            </View>
          ) : (
            leaders.map((item, idx) => {
              const isCurrentUser = currentUserStanding?.id === item.id;
              const isTopThree = idx < 3;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.ledgerRow,
                    idx > 0 && styles.ledgerRowBorder,
                    isCurrentUser && styles.ledgerRowHighlighted,
                  ]}
                >
                  {isCurrentUser && <View style={styles.currentUserAccentBar} />}

                  {/* Rank Column */}
                  <View style={styles.colOrdCell}>
                    {isTopThree ? (
                      <View style={styles.romanWrap}>
                        <Text
                          style={[
                            styles.romanNumeral,
                            idx === 0 && { color: colors.gold },
                            idx === 1 && { color: colors.silver },
                            idx === 2 && { color: colors.bronze },
                          ]}
                        >
                          {romanNumerals[idx]}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.standardRank}>#{item.rank || idx + 1}</Text>
                    )}
                  </View>

                  {/* Scholar Info */}
                  <View style={styles.colScholarCell}>
                    <View style={styles.scholarNameRow}>
                      <Text
                        style={[
                          styles.scholarName,
                          isCurrentUser && { fontFamily: fonts.headingBold },
                        ]}
                        numberOfLines={1}
                      >
                        {item.display_name}
                      </Text>
                      {isCurrentUser && (
                        <View style={styles.youSmallBadge}>
                          <Text style={styles.youSmallBadgeText}>YOU</Text>
                        </View>
                      )}
                      {item.streak && (
                        <View style={styles.rowStreakTag}>
                          <Text style={styles.rowStreakText}>{item.streak}d</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.scholarActivity} numberOfLines={1}>
                      {item.recent_book_title
                        ? `Reading: ${item.recent_book_title}`
                        : 'Active Reader in Catalog'}
                    </Text>
                  </View>

                  {/* Contribution / XP */}
                  <View style={styles.colXpCell}>
                    <Text
                      style={[
                        styles.xpNumber,
                        isTopThree && { color: colors.accent, fontFamily: fonts.headingBold },
                      ]}
                    >
                      {item.weekly_xp}
                    </Text>
                    <Text style={styles.xpUnit}>XP</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Canon & Measurement Explanation Note */}
        <View style={styles.canonNote}>
          <Ionicons name="book-outline" size={17} color={colors.outline} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.canonHeading}>ARCHIVE CANON & MEASUREMENT</Text>
            <Text style={styles.canonBody}>
              XP is earned through verified reading duration (10 XP per 15 minutes of continuous study),
              session completions, and scholarly contributions.
            </Text>
          </View>
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
    paddingHorizontal: spacing.md,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Header */
  header: {
    paddingVertical: spacing.md,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerMetaText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.outline,
    letterSpacing: 1,
  },
  resetWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkSecondary,
  },
  headerTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSecondary,
    marginTop: 2,
  },

  /* Pinned Card */
  userPinnedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  userPinnedTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatarWrap: {
    position: 'relative',
    marginRight: spacing.sm + 2,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarInitial: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
    color: colors.accent,
  },
  youBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    backgroundColor: colors.accent,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  youBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 8,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  userPinnedDetails: {
    flex: 1,
  },
  userRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userPinnedName: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.ink,
  },
  userRankNumber: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.accent,
  },
  userSubtext: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
    fontStyle: 'italic',
    marginTop: 1,
  },
  userPinnedXpWrap: {
    alignItems: 'flex-end',
  },
  userPinnedXp: {
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: colors.accent,
  },
  userPinnedXpUnit: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.inkSecondary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    marginTop: 2,
  },
  streakText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.onSecondaryContainer,
  },
  telemetryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  telemetryCol: {
    alignItems: 'center',
  },
  telemetryLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 0.8,
  },
  telemetryValue: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.ink,
    marginTop: 2,
  },
  telemetryDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },

  /* Filter */
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  filterGroup: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
  },
  filterBtnActive: {
    backgroundColor: colors.ink,
  },
  filterBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.inkSecondary,
  },
  filterBtnTextActive: {
    color: '#FFFFFF',
  },
  activeScholarsText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.outline,
  },

  /* Ledger Table */
  ledgerTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    backgroundColor: colors.surfaceContainer,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  colOrd: {
    width: 38,
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  colScholar: {
    flex: 1,
    marginLeft: spacing.sm,
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 0.8,
  },
  colXp: {
    width: 80,
    textAlign: 'right',
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 0.8,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 3,
    position: 'relative',
  },
  ledgerRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  ledgerRowHighlighted: {
    backgroundColor: '#F7F4EE',
  },
  currentUserAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
    backgroundColor: colors.accent,
  },
  colOrdCell: {
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  romanWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  romanNumeral: {
    fontFamily: fonts.headingBold,
    fontSize: 16,
    color: colors.accent,
  },
  standardRank: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.inkSecondary,
  },
  colScholarCell: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  scholarNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scholarName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.ink,
  },
  youSmallBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  youSmallBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 8,
    color: '#FFFFFF',
  },
  rowStreakTag: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  rowStreakText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.inkSecondary,
  },
  scholarActivity: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkSecondary,
    fontStyle: 'italic',
    marginTop: 1,
  },
  colXpCell: {
    width: 80,
    alignItems: 'flex-end',
  },
  xpNumber: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.ink,
  },
  xpUnit: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.outline,
  },
  emptyWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSecondary,
    marginTop: spacing.xs,
  },

  /* Canon Note */
  canonNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  canonHeading: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.ink,
    letterSpacing: 0.8,
  },
  canonBody: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
});
