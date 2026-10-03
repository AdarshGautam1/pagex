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
import { api } from '../../services/api';
import { StatCard } from '../../components/StatCard';
import { Header } from '../../components/Header';
import { colors, fonts, radius, spacing } from '../../constants/theme';

export default function AdminDashboardScreen() {
  const router = useRouter();

  const [stats, setStats] = useState<any>(null);
  const [personalStats, setPersonalStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      await api.checkIn().catch(() => null);
      const [data, meData] = await Promise.all([
        api.getAdminStats(),
        api.getMyStats().catch(() => null),
      ]);
      setStats(data);
      if (meData) setPersonalStats(meData);
    } catch (err) {
      console.warn('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const adminStreak = Math.max(1, personalStats?.streak?.current || 1);

  return (
    <View style={styles.container}>
      <Header
        title="Admin Console"
        subtitle="Platform governance & oversight"
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={14} color={colors.accent} />
              <Text style={styles.streakBadgeText}>{adminStreak}d</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(student)/(tabs)')}
              style={styles.switchBtn}
            >
              <Ionicons name="book-outline" size={16} color={colors.white} />
              <Text style={styles.switchBtnText}>Student View</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Platform Overview Metrics */}
        <Text style={styles.sectionTitle}>Platform Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricsRow}>
            <StatCard
              label="Total Users"
              value={stats?.total_users || 0}
              icon={<Ionicons name="people-outline" size={20} color={colors.accent} />}
            />
            <View style={{ width: spacing.md }} />
            <StatCard
              label="Active (7d)"
              value={stats?.active_readers_last_7_days || 0}
              subtext="Weekly active readers"
              icon={<Ionicons name="pulse-outline" size={20} color={colors.success} />}
            />
          </View>
          <View style={{ height: spacing.md }} />
          <View style={styles.metricsRow}>
            <StatCard
              label="Books"
              value={stats?.total_books || 0}
              icon={<Ionicons name="library-outline" size={20} color={colors.ink} />}
            />
            <View style={{ width: spacing.md }} />
            <StatCard
              label="Sessions"
              value={stats?.total_reading_sessions || 0}
              icon={<Ionicons name="time-outline" size={20} color={colors.gold} />}
            />
          </View>
        </View>

        {/* Administrative Modules */}
        <Text style={styles.sectionTitle}>Management Modules</Text>

        {/* Module 1: Books */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(admin)/books')}
          style={styles.moduleCard}
        >
          <View style={styles.moduleIconWrap}>
            <Ionicons name="book-outline" size={24} color={colors.accent} />
          </View>
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleTitle}>Manage Books</Text>
            <Text style={styles.moduleSubtitle}>
              Upload volumes, edit metadata, and toggle publishing visibility
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.inkSecondary} />
        </TouchableOpacity>

        {/* Module 2: Categories */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(admin)/categories')}
          style={styles.moduleCard}
        >
          <View style={styles.moduleIconWrap}>
            <Ionicons name="grid-outline" size={24} color={colors.sage} />
          </View>
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleTitle}>Manage Categories</Text>
            <Text style={styles.moduleSubtitle}>
              Organize genres, curricula, and reading categories
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.inkSecondary} />
        </TouchableOpacity>

        {/* Module 3: Audit Logs */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(admin)/audit')}
          style={styles.moduleCard}
        >
          <View style={styles.moduleIconWrap}>
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.gold} />
          </View>
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleTitle}>Audit Trail & Security</Text>
            <Text style={styles.moduleSubtitle}>
              Inspect PDF access logs, book updates, and access security records
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.inkSecondary} />
        </TouchableOpacity>

        {/* Module 4: Community Notes */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(admin)/community-notes' as any)}
          style={styles.moduleCard}
        >
          <View style={styles.moduleIconWrap}>
            <Ionicons name="documents-outline" size={24} color={colors.accent} />
          </View>
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleTitle}>Community Notes Moderation</Text>
            <Text style={styles.moduleSubtitle}>
              Review, approve, reject, or remove student-uploaded notes and study PDFs
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.inkSecondary} />
        </TouchableOpacity>
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
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF3E8',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(230, 81, 0, 0.2)',
    gap: 3,
  },
  streakBadgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.accent,
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    gap: 4,
  },
  switchBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.white,
  },
  sectionTitle: {
    fontFamily: fonts.subheading,
    fontSize: 16,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  metricsGrid: {
    marginBottom: spacing.xl,
  },
  metricsRow: {
    flexDirection: 'row',
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  moduleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  moduleInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  moduleTitle: {
    fontFamily: fonts.subheading,
    fontSize: 15,
    color: colors.ink,
  },
  moduleSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
