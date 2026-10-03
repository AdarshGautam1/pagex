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
import { StatCard } from '../../../components/StatCard';
import { AchievementBadge } from '../../../components/AchievementBadge';
import { Button } from '../../../components/Button';
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

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
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

  // Map unlocked state to all reference achievements
  const unlockedCodes = new Set(achievements.map((a) => a.code));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: 110 + insets.bottom },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      {/* Profile Header */}
      <View style={styles.profileHeaderCard}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>
            {profile?.display_name?.charAt(0) || 'U'}
          </Text>
        </View>

        <View style={styles.profileMeta}>
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
                style={styles.saveBtn}
              >
                <Ionicons name="checkmark" size={18} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsEditing(false)}
                style={styles.cancelBtn}
              >
                <Ionicons name="close" size={18} color={colors.inkSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.nameRow}>
              <Text style={styles.displayName}>{profile?.display_name}</Text>
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="pencil-outline" size={16} color={colors.accent} />
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.username}>@{profile?.username}</Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{profile?.role?.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* Admin Switcher Banner if role is admin */}
      {profile?.role === 'admin' && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(admin)')}
          style={styles.adminBanner}
        >
          <View style={styles.adminBannerLeft}>
            <Ionicons name="shield-checkmark" size={20} color={colors.white} />
            <Text style={styles.adminBannerText}>Admin Management Console</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.white} />
        </TouchableOpacity>
      )}

      {/* Quick Navigation: Community Notes, Downloads, Bookmarks */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push('/(student)/community-notes' as any)}
        style={styles.menuRow}
      >
        <View style={styles.menuLeft}>
          <Ionicons name="document-text-outline" size={20} color={colors.accent} />
          <Text style={styles.menuText}>Community Notes</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.inkSecondary} />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push('/(student)/downloads' as any)}
        style={styles.menuRow}
      >
        <View style={styles.menuLeft}>
          <Ionicons name="cloud-offline-outline" size={20} color={colors.success} />
          <Text style={styles.menuText}>Downloads & Offline Library</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.inkSecondary} />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push('/(student)/bookmarks')}
        style={styles.menuRow}
      >
        <View style={styles.menuLeft}>
          <Ionicons name="bookmark-outline" size={20} color={colors.gold} />
          <Text style={styles.menuText}>Saved Bookmarks</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.inkSecondary} />
      </TouchableOpacity>


      {/* Reading Statistics */}
      <Text style={styles.sectionTitle}>Reading Habits & Metrics</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statsGridRow}>
          <StatCard
            label="Current Streak"
            value={`${Math.max(1, stats?.streak?.current || 1)}d`}
            icon={<Ionicons name="flame" size={18} color={colors.accent} />}
          />
          <View style={{ width: spacing.md }} />
          <StatCard
            label="Longest Streak"
            value={`${Math.max(stats?.streak?.current || 1, stats?.streak?.longest || 1)}d`}
            icon={<Ionicons name="ribbon-outline" size={18} color={colors.gold} />}
          />
        </View>
        <View style={{ height: spacing.md }} />
        <View style={styles.statsGridRow}>
          <StatCard
            label="Total XP"
            value={stats?.xp?.total || 0}
            icon={<Ionicons name="star" size={18} color={colors.gold} />}
          />
          <View style={{ width: spacing.md }} />
          <StatCard
            label="Time Read"
            value={`${stats?.reading?.totalMinutes || 0}m`}
            subtext={`${stats?.reading?.booksRead || 0} books completed`}
            icon={<Ionicons name="time-outline" size={18} color={colors.sage} />}
          />
        </View>
      </View>

      {/* Achievements Section */}
      <View style={styles.achievementsHeader}>
        <Text style={styles.sectionTitle}>Achievements Showcase</Text>
        <Text style={styles.achCount}>
          {achievements.length} of {allAchievements.length} Unlocked
        </Text>
      </View>

      {allAchievements.map((ach) => {
        const isUnlocked = unlockedCodes.has(ach.code);
        const unlockedData = achievements.find((a) => a.code === ach.code);

        return (
          <AchievementBadge
            key={ach.id}
            achievement={{
              ...ach,
              earned_at: unlockedData?.earned_at,
            }}
            isUnlocked={isUnlocked}
          />
        );
      })}

      {/* Sign Out Button */}
      <Button
        title="Sign Out"
        variant="outline"
        onPress={handleSignOut}
        style={styles.signOutBtn}
      />
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
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: colors.white,
  },
  profileMeta: {
    flex: 1,
    marginLeft: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  displayName: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
  },
  username: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceActive,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  roleText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.inkSecondary,
    letterSpacing: 0.5,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  editInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    padding: 6,
    borderRadius: radius.sm,
  },
  cancelBtn: {
    padding: 6,
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  adminBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  adminBannerText: {
    fontFamily: fonts.subheading,
    fontSize: 14,
    color: colors.white,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },
  sectionTitle: {
    fontFamily: fonts.subheading,
    fontSize: 16,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  statsGrid: {
    marginBottom: spacing.lg,
  },
  statsGridRow: {
    flexDirection: 'row',
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  achCount: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.accent,
  },
  signOutBtn: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
});
