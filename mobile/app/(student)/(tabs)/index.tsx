import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import { StatCard } from '../../../components/StatCard';
import { BookCard, BookItem } from '../../../components/BookCard';
import { colors, fonts, radius, spacing } from '../../../constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

  const [stats, setStats] = useState<any>(null);
  const [books, setBooks] = useState<BookItem[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const loadData = async () => {
    try {
      // Ensure daily active check-in is recorded so today's streak is up to date
      await api.checkIn().catch(() => null);

      const [statsData, booksData, achData, leadData] = await Promise.all([
        api.getMyStats().catch(() => null),
        api.getBooks({ limit: 6 }).catch(() => ({ books: [] })),
        api.getMyAchievements().catch(() => []),
        api.getLeaderboard().catch(() => ({ leaderboard: [] })),
      ]);

      if (statsData) setStats(statsData);
      if (booksData?.books) setBooks(booksData.books);
      if (achData) setAchievements(achData);
      if (leadData?.leaderboard) setLeaderboard(leadData.leaderboard.slice(0, 3));
    } catch (err) {
      console.warn('Error loading home dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const featuredBook = books.length > 0 ? books[0] : null;

  // Active streak counts (ensures active logged-in user has at least 1d streak)
  const currentStreak = Math.max(1, stats?.streak?.current || 1);
  const longestStreak = Math.max(currentStreak, stats?.streak?.longest || 1);

  // Days of current week for habit row
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayIdx = (new Date().getDay() + 6) % 7; // Monday = 0

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: 100 + insets.bottom },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      {/* Top Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.greetingSmall}>{getGreeting()},</Text>
        <Text style={styles.greetingName}>{profile?.display_name || 'Reader'}</Text>
      </View>

      {/* Stats Quick Overview */}
      <View style={styles.statsRow}>
        <StatCard
          label="Reading Streak"
          value={`${currentStreak}d`}
          subtext={`Best: ${longestStreak} days`}
          highlight
          icon={<Ionicons name="flame" size={20} color={colors.accent} />}
        />
        <View style={{ width: spacing.md }} />
        <StatCard
          label="Knowledge XP"
          value={stats?.xp?.total || 0}
          subtext="Total habit points"
          icon={<Ionicons name="star" size={20} color={colors.gold} />}
        />
      </View>

      {/* Quick Study Hub: Community Notes & Offline Downloads */}
      <View style={styles.quickHubRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(student)/community-notes' as any)}
          style={styles.quickHubCard}
        >
          <View style={[styles.quickHubIcon, { backgroundColor: colors.accentSubtle }]}>
            <Ionicons name="document-text" size={18} color={colors.accent} />
          </View>
          <View style={styles.quickHubTextWrap}>
            <Text style={styles.quickHubTitle}>Community Notes</Text>
            <Text style={styles.quickHubSubtitle}>Peer study guides</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.inkSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(student)/downloads' as any)}
          style={styles.quickHubCard}
        >
          <View style={[styles.quickHubIcon, { backgroundColor: '#E8ECE6' }]}>
            <Ionicons name="cloud-offline" size={18} color={colors.success} />
          </View>
          <View style={styles.quickHubTextWrap}>
            <Text style={styles.quickHubTitle}>Downloads</Text>
            <Text style={styles.quickHubSubtitle}>Offline storage</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.inkSecondary} />
        </TouchableOpacity>
      </View>

      {/* Weekly Activity Habit Tracker */}
      <View style={styles.cardSection}>

        <Text style={styles.sectionHeader}>Weekly Reading Habit</Text>
        <View style={styles.habitRow}>
          {daysOfWeek.map((day, idx) => {
            const isToday = idx === todayIdx;

            // Calculate date for this day of current week (YYYY-MM-DD)
            const dayOffset = idx - todayIdx;
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + dayOffset);
            const dateStr = targetDate.toLocaleDateString('en-CA');

            // Day has activity if today (active login), within consecutive streak ending today, or has logged activity
            const isInStreak = idx <= todayIdx && idx >= (todayIdx - currentStreak + 1);
            const hasRecordedActivity = stats?.weeklyActivity?.some(
              (a: any) => a.activity_date === dateStr && (a.reading_seconds > 0 || a.xp_earned > 0)
            );
            const hasActivity = isToday || isInStreak || Boolean(hasRecordedActivity);

            return (
              <View key={idx} style={styles.dayCol}>
                <Text style={[styles.dayLabel, isToday && styles.todayLabel]}>{day}</Text>
                <View
                  style={[
                    styles.dayCircle,
                    hasActivity && styles.activeDayCircle,
                    isToday && styles.todayCircleBorder,
                  ]}
                >
                  {hasActivity ? (
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Continue Reading / Featured */}
      {featuredBook && (
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeader}>Featured Book</Text>
          <BookCard
            book={featuredBook}
            layout="horizontal"
            onPress={() => router.push(`/(student)/book/${featuredBook.id}` as any)}
          />
        </View>
      )}

      {/* Recently Added Books */}
      <View style={styles.sectionWrap}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionHeader}>Explore Library</Text>
          <TouchableOpacity onPress={() => router.push('/(student)/(tabs)/library')}>
            <Text style={styles.linkText}>View All →</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              layout="grid"
              onPress={() => router.push(`/(student)/book/${book.id}` as any)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Achievements Banner */}
      <View style={styles.cardSection}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionHeader}>Achievements</Text>
          <TouchableOpacity onPress={() => router.push('/(student)/achievements')}>
            <Text style={styles.linkText}>See all ({achievements.length}) →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.achievementsPreviewRow}>
          {achievements.length > 0 ? (
            achievements.slice(0, 4).map((a, i) => (
              <View key={i} style={styles.achPreviewBadge}>
                <Text style={styles.achIconText}>{a.icon || '🏆'}</Text>
                <Text style={styles.achNameText} numberOfLines={1}>{a.name}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyAchText}>
              Read for 5 minutes today to unlock your first achievement!
            </Text>
          )}
        </View>
      </View>

      {/* Weekly Leaderboard Snippet */}
      {leaderboard.length > 0 && (
        <View style={styles.cardSection}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionHeader}>Weekly Top Readers</Text>
            <TouchableOpacity onPress={() => router.push('/(student)/(tabs)/leaderboard')}>
              <Text style={styles.linkText}>Leaderboard →</Text>
            </TouchableOpacity>
          </View>
          {leaderboard.map((item, idx) => (
            <View key={item.id} style={styles.leaderRow}>
              <View style={styles.rankCircle}>
                <Text style={styles.rankText}>#{idx + 1}</Text>
              </View>
              <Text style={styles.leaderName} numberOfLines={1}>
                {item.display_name}
              </Text>
              <Text style={styles.leaderXp}>{item.weekly_xp} XP</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
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
  greetingSection: {
    marginBottom: spacing.lg,
  },
  greetingSmall: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSecondary,
  },
  greetingName: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  cardSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  sectionWrap: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    fontFamily: fonts.subheading,
    fontSize: 16,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  linkText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.accent,
  },
  habitRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.xs,
  },
  dayCol: {
    alignItems: 'center',
  },
  dayLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.inkSecondary,
    marginBottom: 6,
  },
  todayLabel: {
    color: colors.accent,
    fontFamily: fonts.subheading,
  },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceActive,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeDayCircle: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  todayCircleBorder: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  horizontalScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  achievementsPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  achPreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  achIconText: {
    fontSize: 16,
    marginRight: 6,
  },
  achNameText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.ink,
    maxWidth: 90,
  },
  emptyAchText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
    fontStyle: 'italic',
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  rankCircle: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceActive,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rankText: {
    fontFamily: fonts.subheading,
    fontSize: 10,
    color: colors.inkSecondary,
  },
  leaderName: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },
  leaderXp: {
    fontFamily: fonts.subheading,
    fontSize: 13,
    color: colors.accent,
  },
  quickHubRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  quickHubCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickHubIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs + 2,
  },
  quickHubTextWrap: {
    flex: 1,
  },
  quickHubTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.ink,
  },
  quickHubSubtitle: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkSecondary,
  },
});

