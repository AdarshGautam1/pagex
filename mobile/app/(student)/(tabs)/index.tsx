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
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
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
      await api.checkIn().catch(() => null);

      const [statsData, booksData, achData, leadData] = await Promise.all([
        api.getMyStats().catch(() => null),
        api.getBooks({ limit: 8 }).catch(() => ({ books: [] })),
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
  const currentStreak = Math.max(1, stats?.streak?.current || 1);
  const totalXp = stats?.xp?.total || 0;
  const userLevel = stats?.level || Math.max(1, Math.floor(totalXp / 100) + 1);

  // Discrete Mon-Sun tracker
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayIdx = (new Date().getDay() + 6) % 7;

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
        { paddingTop: insets.top + spacing.sm, paddingBottom: 90 + insets.bottom },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      {/* Top Archival Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.brandCluster}>
          <View style={styles.logoBadge}>
            <Ionicons name="book" size={17} color={colors.accent} />
          </View>
          <View>
            <View style={styles.brandTitleRow}>
              <Text style={styles.brandTitle}>PAGEX</Text>
              <Text style={styles.brandSubtitle}>E-LIBRARY</Text>
            </View>
            <Text style={styles.brandEdition}>Archival Edition</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/(student)/(tabs)/library')}
            accessibilityLabel="Search Library"
          >
            <Ionicons name="search-outline" size={20} color={colors.inkSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/(student)/bookmarks')}
            accessibilityLabel="Bookmarks"
          >
            <Ionicons name="bookmark-outline" size={20} color={colors.inkSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => router.push('/(student)/(tabs)/profile')}
            accessibilityLabel="Profile"
          >
            <View style={styles.avatarInner}>
              <Text style={styles.avatarLetter}>
                {(profile?.display_name || 'R').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.levelTag}>
              <Text style={styles.levelTagText}>L{userLevel}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Greeting & Reader Status */}
      <View style={styles.greetingSection}>
        <View style={styles.statusPill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.statusPillText}>
            Archive active • {currentStreak} day reading streak
          </Text>
        </View>

        <Text style={styles.greetingTitle}>
          {getGreeting()},{' '}
          <Text style={styles.greetingNameItalic}>
            {profile?.display_name || 'Reader'}
          </Text>
        </Text>
        <Text style={styles.greetingSub}>
          The archive is silent and ready for your session.
        </Text>
      </View>

      {/* Hero: Active Codex (Continue Reading) */}
      {featuredBook && (
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>ACTIVE CODEX</Text>
            </View>
            <Text style={styles.heroMetaDate}>In circulation</Text>
          </View>

          <View style={styles.heroMain}>
            <View style={styles.heroCoverWrap}>
              {featuredBook.cover_url ? (
                <Image
                  source={{ uri: featuredBook.cover_url }}
                  style={styles.heroCover}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.heroPlaceholderCover}>
                  <Ionicons name="book-outline" size={32} color={colors.accent} />
                </View>
              )}
              {/* Tactile Book Spine Edge Shadow */}
              <View style={styles.heroSpineShadow} />
            </View>

            <View style={styles.heroDetails}>
              <Text style={styles.heroAuthor} numberOfLines={1}>
                {featuredBook.author}
              </Text>
              <Text style={styles.heroBookTitle} numberOfLines={2}>
                {featuredBook.title}
              </Text>
              <Text style={styles.heroCategory}>
                {featuredBook.categories?.name || 'General Archive'} • {featuredBook.page_count} pages
              </Text>

              {/* Progress Spine */}
              <View style={styles.progressWrap}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Reading Progress</Text>
                  <Text style={styles.progressPercent}>
                    {featuredBook.progress_percent || 35}%
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${featuredBook.progress_percent || 35}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.heroActionRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.heroPrimaryBtn}
              onPress={() => router.push(`/(student)/book/${featuredBook.id}` as any)}
            >
              <Text style={styles.heroPrimaryBtnText}>Continue Reading</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.white} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.heroBookmarkBtn}
              onPress={() => router.push('/(student)/bookmarks')}
              accessibilityLabel="View Bookmarks"
            >
              <Ionicons name="bookmark" size={18} color={colors.ink} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Shelf Carousel: Recent On Your Shelf */}
      <View style={styles.sectionWrap}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionTitleLeft}>
            <Text style={styles.sectionTitle}>Recent On Your Shelf</Text>
            <View style={styles.terracottaDot} />
          </View>
          <TouchableOpacity onPress={() => router.push('/(student)/(tabs)/library')}>
            <Text style={styles.viewAllText}>View All ({books.length})</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={{ paddingRight: spacing.md }}
        >
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

      {/* Weekly Cadence (Restrained Metric Card) */}
      <View style={styles.cadenceCard}>
        <View style={styles.cadenceHeader}>
          <View style={styles.cadenceHeaderLeft}>
            <Ionicons name="calendar-outline" size={18} color={colors.accent} />
            <Text style={styles.cadenceTitle}>Weekly Cadence</Text>
          </View>
          <Text style={styles.cadenceStatus}>
            {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'} Active
          </Text>
        </View>

        {/* 7-Day Track */}
        <View style={styles.dayTrackRow}>
          {daysOfWeek.map((day, idx) => {
            const isToday = idx === todayIdx;
            const isInStreak = idx <= todayIdx && idx >= Math.max(0, todayIdx - currentStreak + 1);
            const isActive = isToday || isInStreak;

            return (
              <View key={idx} style={styles.dayCol}>
                <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{day}</Text>
                <View
                  style={[
                    styles.dayCircle,
                    isActive && styles.dayCircleActive,
                    isToday && styles.dayCircleToday,
                  ]}
                >
                  {isActive ? (
                    <Ionicons name="checkmark" size={13} color={colors.white} />
                  ) : (
                    <Text style={styles.inactiveDot}>·</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* 3 Quiet Stats */}
        <View style={styles.quietStatsGrid}>
          <View style={styles.quietStatCell}>
            <Text style={styles.quietStatLabel}>STREAK</Text>
            <Text style={styles.quietStatValue}>{currentStreak}d</Text>
          </View>
          <View style={styles.quietStatCell}>
            <Text style={styles.quietStatLabel}>VOLUMES</Text>
            <Text style={styles.quietStatValue}>{books.length}</Text>
          </View>
          <View style={styles.quietStatCell}>
            <Text style={styles.quietStatLabel}>SCHOLARLY XP</Text>
            <Text style={[styles.quietStatValue, { color: colors.accent }]}>{totalXp}</Text>
          </View>
        </View>
      </View>

      {/* Auxiliary Hubs: Community Notes & Offline Volumes */}
      <View style={styles.hubGrid}>
        {/* Community Notes */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.communityCard}
          onPress={() => router.push('/(student)/community-notes' as any)}
        >
          <View style={styles.communityTopRow}>
            <View style={styles.communityIconWrap}>
              <Ionicons name="document-text-outline" size={19} color={colors.accent} />
              <Text style={styles.communityHeading}>Community Notes</Text>
            </View>
            <View style={styles.communityBadge}>
              <Text style={styles.communityBadgeText}>Open Access</Text>
            </View>
          </View>
          <Text style={styles.communityDesc}>
            Peer-shared scholarly annotations, reading guides, and lecture PDFs.
          </Text>
          <View style={styles.communityFooterRow}>
            <Text style={styles.communityActionText}>Explore Archive</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.accent} />
          </View>
        </TouchableOpacity>

        {/* Offline Downloads */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.offlineCard}
          onPress={() => router.push('/(student)/downloads' as any)}
        >
          <View style={styles.communityTopRow}>
            <View style={styles.communityIconWrap}>
              <Ionicons name="cloud-offline-outline" size={19} color={colors.secondary} />
              <Text style={styles.communityHeading}>Offline Reading</Text>
            </View>
            <View style={[styles.communityBadge, { backgroundColor: colors.secondaryContainer }]}>
              <Text style={[styles.communityBadgeText, { color: colors.onSecondaryContainer }]}>
                Saved
              </Text>
            </View>
          </View>
          <Text style={styles.communityDesc}>
            Access downloaded codices securely even without an active internet connection.
          </Text>
          <View style={styles.communityFooterRow}>
            <Text style={[styles.communityActionText, { color: colors.secondary }]}>
              View Downloads
            </Text>
            <Ionicons name="arrow-forward" size={14} color={colors.secondary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Top Readers / Leaderboard Preview */}
      {leaderboard.length > 0 && (
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleLeft}>
              <Text style={styles.sectionTitle}>Weekly Top Readers</Text>
              <View style={styles.terracottaDot} />
            </View>
            <TouchableOpacity onPress={() => router.push('/(student)/(tabs)/leaderboard')}>
              <Text style={styles.viewAllText}>Rankings →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.leaderboardBox}>
            {leaderboard.map((item, idx) => (
              <View key={item.id} style={[styles.leaderRow, idx > 0 && styles.leaderRowBorder]}>
                <View
                  style={[
                    styles.rankBadge,
                    idx === 0 && { backgroundColor: '#FBF3D5' },
                    idx === 1 && { backgroundColor: '#EDEDEA' },
                    idx === 2 && { backgroundColor: '#F5ECE3' },
                  ]}
                >
                  <Text
                    style={[
                      styles.rankText,
                      idx === 0 && { color: colors.gold },
                      idx === 1 && { color: colors.silver },
                      idx === 2 && { color: colors.bronze },
                    ]}
                  >
                    #{idx + 1}
                  </Text>
                </View>
                <Text style={styles.leaderName} numberOfLines={1}>
                  {item.display_name}
                </Text>
                <Text style={styles.leaderXp}>{item.weekly_xp} XP</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Archival Colophon / Footer */}
      <View style={styles.colophonWrap}>
        <Text style={styles.colophonText}>
          PAGEX ARCHIVE CURATED EDITION • EX LIBRIS {profile?.display_name?.toUpperCase() || 'STUDENT'}
        </Text>
      </View>
    </ScrollView>
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

  /* Header Bar */
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  brandTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  brandEdition: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkSecondary,
    marginTop: -2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarWrap: {
    position: 'relative',
    marginLeft: 2,
  },
  avatarInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  levelTag: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.ink,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
  },
  levelTagText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 8,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  /* Greeting */
  greetingSection: {
    paddingVertical: spacing.md,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
    gap: 6,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
  statusPillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.inkSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  greetingTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  greetingNameItalic: {
    fontFamily: fonts.displayItalic,
    color: colors.accent,
  },
  greetingSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSecondary,
    marginTop: 3,
  },

  /* Hero: Active Codex */
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  heroBadge: {
    backgroundColor: colors.accentSubtle,
    paddingHorizontal: spacing.xs + 3,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  heroBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 0.8,
  },
  heroMetaDate: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
  },
  heroMain: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  heroCoverWrap: {
    width: 84,
    height: 126, // 2:3 ratio
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceHigh,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroCover: {
    width: '100%',
    height: '100%',
  },
  heroSpineShadow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  heroPlaceholderCover: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
  },
  heroDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  heroAuthor: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.outline,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroBookTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
    lineHeight: 23,
    marginTop: 2,
  },
  heroCategory: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  progressWrap: {
    marginTop: spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  progressLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
  },
  progressPercent: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.accent,
  },
  progressTrack: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceContainer,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  heroPrimaryBtn: {
    flex: 1,
    height: 44,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroPrimaryBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  heroBookmarkBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Sections */
  sectionWrap: {
    marginBottom: spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 19,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  terracottaDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
  },
  viewAllText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  horizontalScroll: {
    marginHorizontal: -spacing.md,
    paddingLeft: spacing.md,
  },

  /* Cadence */
  cadenceCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  cadenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cadenceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cadenceTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.ink,
  },
  cadenceStatus: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dayTrackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  dayCol: {
    alignItems: 'center',
    gap: 4,
  },
  dayLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkMuted,
  },
  dayLabelToday: {
    color: colors.accent,
    fontFamily: fonts.bodySemiBold,
  },
  dayCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: colors.accent,
  },
  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  inactiveDot: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 16,
  },
  quietStatsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quietStatCell: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  quietStatLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 0.6,
  },
  quietStatValue: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
    color: colors.ink,
    marginTop: 2,
  },

  /* Hub Grid */
  hubGrid: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  communityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  offlineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  communityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  communityIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  communityHeading: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.ink,
  },
  communityBadge: {
    backgroundColor: colors.accentSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  communityBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  communityDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
    lineHeight: 18,
  },
  communityFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  communityActionText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.accent,
    letterSpacing: 0.3,
  },

  /* Leaderboard Box */
  leaderboardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  leaderRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rankText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.ink,
  },
  leaderName: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.ink,
  },
  leaderXp: {
    fontFamily: fonts.headingBold,
    fontSize: 13,
    color: colors.accent,
  },

  /* Colophon */
  colophonWrap: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colophonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.outline,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
});
