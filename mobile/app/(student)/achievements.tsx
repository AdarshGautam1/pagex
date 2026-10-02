import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { api } from '../../services/api';
import { Header } from '../../components/Header';
import { AchievementBadge } from '../../components/AchievementBadge';
import { colors, fonts, radius, spacing } from '../../constants/theme';

export default function AchievementsScreen() {
  const [allAchievements, setAllAchievements] = useState<any[]>([]);
  const [myAchievements, setMyAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAchievements = async () => {
    try {
      const [allData, myData] = await Promise.all([
        api.getAchievements().catch(() => []),
        api.getMyAchievements().catch(() => []),
      ]);
      setAllAchievements(allData || []);
      setMyAchievements(myData || []);
    } catch (err) {
      console.warn('Failed to load achievements:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAchievements();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const unlockedCodes = new Set(myAchievements.map((a) => a.code));
  const progressPercent = allAchievements.length > 0
    ? Math.round((myAchievements.length / allAchievements.length) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <Header title="Achievements" showBack />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressTopRow}>
            <Text style={styles.progressTitle}>Quest Completion</Text>
            <Text style={styles.progressPercent}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressSubtitle}>
            {myAchievements.length} of {allAchievements.length} badges unlocked
          </Text>
        </View>

        {/* Badges List */}
        <Text style={styles.listHeader}>Available Badges</Text>
        {allAchievements.map((ach) => {
          const isUnlocked = unlockedCodes.has(ach.code);
          const unlockedData = myAchievements.find((a) => a.code === ach.code);

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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.xl,
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
  progressCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressTitle: {
    fontFamily: fonts.subheading,
    fontSize: 16,
    color: colors.ink,
  },
  progressPercent: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.accent,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.surfaceActive,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs + 2,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.full,
  },
  progressSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
  },
  listHeader: {
    fontFamily: fonts.subheading,
    fontSize: 16,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
});
