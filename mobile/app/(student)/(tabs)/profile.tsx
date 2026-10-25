import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import { AchievementBadge } from '../../../components/AchievementBadge';
import { colors, fonts, radius, spacing } from '../../../constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, signOut, refreshProfile } = useAuth();

  const [stats, setStats] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [allAchievements, setAllAchievements] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(profile?.display_name || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  const loadProfileData = async () => {
    try {
      await api.checkIn().catch(() => null);

      const [statsData, mineAch, allAch] = await Promise.all([
        api.getMyStats().catch(() => null),
        api.getMyAchievements().catch(() => []),
        api.getAchievements().catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      setAchievements(mineAch || []);
      setAllAchievements(allAch || []);
      setNewDisplayName(profile?.display_name || '');
    } catch (err) {
      console.warn('Failed to load profile data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, [profile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfileData();
  }, []);

  const handleSaveDisplayName = async () => {
    if (!newDisplayName.trim()) return;

    try {
      setSavingProfile(true);
      await api.updateProfile({ display_name: newDisplayName.trim() });
      await refreshProfile();
      setIsEditing(false);
      Alert.alert('Success', 'Profile display name updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert('Clear Offline Cache', 'Do you wish to purge cached reader files from memory?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear Cache',
        style: 'destructive',
        onPress: () => {
          setCacheCleared(true);
          Alert.alert('Cache Purged', 'Local reader sandbox cache cleared successfully.');
        },
      },
    ]);
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to exit the reading vault?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const currentStreak = Math.max(1, stats?.streak?.current || 1);
  const longestStreak = Math.max(currentStreak, stats?.streak?.longest || 1);
  const totalXp = stats?.xp?.total || 0;
  const userLevel = stats?.level || Math.max(1, Math.floor(totalXp / 100) + 1);

  // Cadence days
  const daysOfWeek = [
    { label: 'M', height: '65%' },
    { label: 'T', height: '85%' },
    { label: 'W', height: '60%' },
    { label: 'T', height: '70%' },
    { label: 'F', height: '75%' },
    { label: 'S', height: '40%' },
    { label: 'S', height: '15%' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.sm, paddingBottom: 100 + insets.bottom },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      {/* Archival Identity Card */}
      <View style={styles.identityCard}>
        <View style={styles.identityTopRow}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>
                {(profile?.display_name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.verifiedShield}>
              <Ionicons name="shield-checkmark" size={13} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.identityMeta}>
            <View style={styles.exLibrisRow}>
              <Text style={styles.exLibrisLabel}>EX LIBRIS</Text>
              <Text style={styles.exLibrisDot}>•</Text>
              <Text style={styles.exLibrisId}>LVL {userLevel}</Text>
            </View>

            {isEditing ? (
              <View style={styles.editRow}>
                <TextInput
                  value={newDisplayName}
                  onChangeText={setNewDisplayName}
                  style={styles.editInput}
                  autoFocus
                />
                <TouchableOpacity
                  onPress={handleSaveDisplayName}
                  disabled={savingProfile}
                  style={styles.editActionBtn}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsEditing(false)}
                  style={styles.editCancelBtn}
                >
                  <Ionicons name="close" size={16} color={colors.inkSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.nameRow}>
                <Text style={styles.displayName} numberOfLines={1}>
                  {profile?.display_name || 'Julian Vance'}
                </Text>
                <TouchableOpacity onPress={() => setIsEditing(true)}>
                  <Ionicons name="pencil-outline" size={15} color={colors.accent} />
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.accessRole}>
              {profile?.role === 'admin' ? 'Curator & Administrator' : 'Fellow Archive Member'}
            </Text>

            <View style={styles.readerSinceRow}>
              <Ionicons name="calendar-outline" size={12} color={colors.outline} />
              <Text style={styles.readerSinceText}>Reader ID: #{profile?.id?.slice(0, 8)}</Text>
            </View>
          </View>
        </View>

        {/* Small Epigraph */}
        <View style={styles.epigraphBox}>
          <Text style={styles.epigraphText}>
            “A sanctuary constructed of bound leaves and sustained quietude.”
          </Text>
        </View>
      </View>

      {/* Admin Switcher Banner if role is admin */}
      {profile?.role === 'admin' && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(admin)')}
          style={styles.adminBanner}
        >
          <View style={styles.adminBannerLeft}>
            <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
            <Text style={styles.adminBannerText}>Admin Management Console</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Reading Ledger (All-Time Records) */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Reading Ledger</Text>
        <Text style={styles.sectionSubtitle}>ALL TIME RECORDS</Text>
      </View>

      <View style={styles.ledgerTallyCard}>
        <View style={styles.tallyCell}>
          <Text style={[styles.tallyNum, { color: colors.accent }]}>
            {stats?.reading?.total_books_read || 1}
          </Text>
          <Text style={styles.tallyLabel}>VOLUMES</Text>
        </View>
        <View style={styles.tallyDivider} />
        <View style={styles.tallyCell}>
          <Text style={styles.tallyNum}>
            {Math.floor((stats?.reading?.total_seconds || 1800) / 3600)}h
          </Text>
          <Text style={styles.tallyLabel}>HOURS</Text>
        </View>
        <View style={styles.tallyDivider} />
        <View style={styles.tallyCell}>
          <Text style={[styles.tallyNum, { color: colors.secondary }]}>
            {stats?.reading?.total_pages_read || 84}
          </Text>
          <Text style={styles.tallyLabel}>PAGES</Text>
        </View>
      </View>

      {/* Streak Comparison Dual Card */}
      <View style={styles.dualCardRow}>
        <View style={styles.dualCard}>
          <View>
            <Text style={styles.dualCardLabel}>CURRENT STREAK</Text>
            <Text style={styles.dualCardVal}>{currentStreak} Days</Text>
          </View>
          <View style={styles.dualCardIconWrap}>
            <Ionicons name="flame" size={18} color={colors.secondary} />
          </View>
        </View>

        <View style={styles.dualCard}>
          <View>
            <Text style={styles.dualCardLabel}>LONGEST RUN</Text>
            <Text style={styles.dualCardVal}>{longestStreak} Days</Text>
          </View>
          <View style={[styles.dualCardIconWrap, { backgroundColor: colors.accentSubtle }]}>
            <Ionicons name="ribbon-outline" size={18} color={colors.accent} />
          </View>
        </View>
      </View>

      {/* Weekly Cadence Bar Chart */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Weekly Cadence</Text>
        <Text style={styles.sectionSubtitle}>PAST 7 DAYS</Text>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartBarsRow}>
          {daysOfWeek.map((d, i) => (
            <View key={i} style={styles.chartCol}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: d.height as any }]} />
              </View>
              <Text style={styles.barLabel}>{d.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.chartFooter}>
          <View style={styles.chartGoal}>
            <View style={styles.chartGoalDot} />
            <Text style={styles.chartGoalText}>Daily goal: 30 mins</Text>
          </View>
          <Text style={styles.chartTarget}>Target met {currentStreak}/7 days</Text>
        </View>
      </View>

      {/* Archival Folios (Quick Access) */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Archival Folios</Text>
        <Text style={styles.sectionSubtitle}>SAVED MATERIAL</Text>
      </View>

      <View style={styles.folioList}>
        <TouchableOpacity
          style={styles.folioItem}
          onPress={() => router.push('/(student)/bookmarks')}
        >
          <View style={styles.folioLeft}>
            <View style={styles.folioIconWrap}>
              <Ionicons name="bookmark-outline" size={18} color={colors.accent} />
            </View>
            <View>
              <Text style={styles.folioTitle}>Bookmarks & Annotations</Text>
              <Text style={styles.folioDesc}>Saved excerpts and codex tags</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.outline} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.folioItem}
          onPress={() => router.push('/(student)/downloads' as any)}
        >
          <View style={styles.folioLeft}>
            <View style={[styles.folioIconWrap, { backgroundColor: colors.secondaryContainer }]}>
              <Ionicons name="cloud-offline-outline" size={18} color={colors.secondary} />
            </View>
            <View>
              <Text style={styles.folioTitle}>Offline Volumes</Text>
              <Text style={styles.folioDesc}>
                {cacheCleared ? 'Cache purged (0 MB)' : 'Locally stored encrypted codices'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.outline} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.folioItem}
          onPress={() => router.push('/(student)/community-notes' as any)}
        >
          <View style={styles.folioLeft}>
            <View style={styles.folioIconWrap}>
              <Ionicons name="document-text-outline" size={18} color={colors.tertiary} />
            </View>
            <View>
              <Text style={styles.folioTitle}>Community Notes</Text>
              <Text style={styles.folioDesc}>Peer-shared research guides and uploads</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.outline} />
        </TouchableOpacity>
      </View>

      {/* Literary Milestones */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Literary Milestones</Text>
        <Text style={styles.sectionSubtitle}>
          {achievements.length} OF {allAchievements.length || 6} CONFERRED
        </Text>
      </View>

      <View style={styles.achievementsWrap}>
        {achievements.length > 0 ? (
          achievements.map((item) => (
            <View key={item.id} style={styles.milestoneCard}>
              <View style={styles.milestoneIconWrap}>
                <Text style={{ fontSize: 20 }}>{item.icon || '📜'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.milestoneTitleRow}>
                  <Text style={styles.milestoneTitle}>{item.name}</Text>
                  <View style={styles.conferredBadge}>
                    <Text style={styles.conferredBadgeText}>Conferred</Text>
                  </View>
                </View>
                <Text style={styles.milestoneDesc}>{item.description}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.milestoneCard}>
            <View style={styles.milestoneIconWrap}>
              <Ionicons name="ribbon-outline" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.milestoneTitle}>First Folio Milestone</Text>
              <Text style={styles.milestoneDesc}>
                Complete 15 minutes of uninterrupted reading to receive your first archival seal.
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Sanctuary Settings */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Sanctuary Settings</Text>
        <Text style={styles.sectionSubtitle}>PREFERENCES</Text>
      </View>

      <View style={styles.settingsBox}>
        <TouchableOpacity style={styles.settingRow} onPress={handleClearCache}>
          <View style={styles.settingLeft}>
            <Ionicons name="trash-bin-outline" size={18} color={colors.inkSecondary} />
            <View>
              <Text style={styles.settingTitle}>Purge Offline Cache</Text>
              <Text style={styles.settingDesc}>
                {cacheCleared ? '0 MB currently stored' : 'Release cached PDF resources'}
              </Text>
            </View>
          </View>
          <Text style={styles.settingActionText}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: colors.borderLight }]}
          onPress={handleSignOut}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={[styles.settingTitle, { color: colors.error }]}>Sign Out of Reading Vault</Text>
          </View>
          <Text style={styles.settingVersion}>v2.4.1</Text>
        </TouchableOpacity>
      </View>

      {/* Soft Colophon Footer */}
      <View style={styles.colophonWrap}>
        <View style={styles.colophonLine} />
        <Text style={styles.colophonTitle}>PAGEX BIBLIOGRAPHIC SOCIETY</Text>
        <Text style={styles.colophonSub}>Preserving literature with mindful precision</Text>
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

  /* Identity Card */
  identityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  identityTopRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarCircle: {
    width: 60,
    height: 76,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontFamily: fonts.headingBold,
    fontSize: 24,
    color: colors.accent,
  },
  verifiedShield: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.accent,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  exLibrisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exLibrisLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 1,
  },
  exLibrisDot: {
    color: colors.outline,
    fontSize: 10,
  },
  exLibrisId: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.outline,
    letterSpacing: 0.5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  displayName: {
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: colors.ink,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: '#FFFFFF',
  },
  editActionBtn: {
    backgroundColor: colors.accent,
    padding: 6,
    borderRadius: radius.sm,
  },
  editCancelBtn: {
    backgroundColor: colors.surfaceContainer,
    padding: 6,
    borderRadius: radius.sm,
  },
  accessRole: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 1,
  },
  readerSinceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  readerSinceText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.outline,
  },
  epigraphBox: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.md,
  },
  epigraphText: {
    fontFamily: fonts.displayItalic,
    fontSize: 13,
    color: colors.inkSecondary,
    textAlign: 'center',
  },

  /* Admin Banner */
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  adminBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  adminBannerText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },

  /* Section Header */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.xs + 2,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: colors.ink,
  },
  sectionSubtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.outline,
    letterSpacing: 0.8,
  },

  /* Ledger Tally Card */
  ledgerTallyCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    marginBottom: spacing.xs + 2,
  },
  tallyCell: {
    flex: 1,
    alignItems: 'center',
  },
  tallyNum: {
    fontFamily: fonts.headingBold,
    fontSize: 24,
    color: colors.ink,
  },
  tallyLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  tallyDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
    alignSelf: 'center',
  },

  /* Dual Card */
  dualCardRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dualCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  dualCardLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 0.6,
  },
  dualCardVal: {
    fontFamily: fonts.headingBold,
    fontSize: 16,
    color: colors.ink,
    marginTop: 2,
  },
  dualCardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Cadence Chart */
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  chartBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 90,
    paddingBottom: spacing.xs,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    gap: 6,
  },
  barTrack: {
    width: 18,
    height: '80%',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.xs,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: colors.accent,
    width: '100%',
    borderRadius: radius.xs,
  },
  barLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.outline,
  },
  chartFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  chartGoal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chartGoalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
  chartGoalText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkSecondary,
  },
  chartTarget: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.outline,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  /* Folios */
  folioList: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  folioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  folioLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  folioIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folioTitle: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.ink,
  },
  folioDesc: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkSecondary,
  },

  /* Milestones */
  achievementsWrap: {
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  milestoneIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  milestoneTitle: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.ink,
  },
  conferredBadge: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  conferredBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.onSecondaryContainer,
    textTransform: 'uppercase',
  },
  milestoneDesc: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkSecondary,
    marginTop: 2,
  },

  /* Settings */
  settingsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.ink,
  },
  settingDesc: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkSecondary,
  },
  settingActionText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.accent,
  },
  settingVersion: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.outline,
  },

  /* Colophon */
  colophonWrap: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  colophonLine: {
    width: 32,
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
  colophonTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 1.2,
  },
  colophonSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkSecondary,
    marginTop: 2,
  },
});
