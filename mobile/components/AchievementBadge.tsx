import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, fonts, radius, spacing } from '../constants/theme';

export interface AchievementItem {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  requirement_value?: number;
  earned_at?: string | null;
}

interface AchievementBadgeProps {
  achievement: AchievementItem;
  isUnlocked?: boolean;
  style?: ViewStyle;
}

export function AchievementBadge({
  achievement,
  isUnlocked = false,
  style,
}: AchievementBadgeProps) {
  const earned = isUnlocked || !!achievement.earned_at;

  return (
    <View style={[styles.container, !earned && styles.lockedContainer, style]}>
      <View style={[styles.iconWrap, !earned && styles.lockedIconWrap]}>
        <Text style={[styles.iconText, !earned && styles.lockedIconText]}>
          {achievement.icon}
        </Text>
      </View>
      <View style={styles.textWrap}>
        <View style={styles.headerRow}>
          <Text style={[styles.name, !earned && styles.lockedName]}>
            {achievement.name}
          </Text>
          {earned ? (
            <View style={styles.unlockedTag}>
              <Text style={styles.unlockedTagText}>UNLOCKED</Text>
            </View>
          ) : (
            <View style={styles.lockedTag}>
              <Text style={styles.lockedTagText}>LOCKED</Text>
            </View>
          )}
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {achievement.description}
        </Text>
        {achievement.earned_at && (
          <Text style={styles.dateText}>
            Earned on {new Date(achievement.earned_at).toLocaleDateString()}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  lockedContainer: {
    backgroundColor: colors.surfaceActive,
    opacity: 0.75,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  lockedIconWrap: {
    backgroundColor: colors.border,
  },
  iconText: {
    fontSize: 22,
  },
  lockedIconText: {
    opacity: 0.4,
  },
  textWrap: {
    flex: 1,
    marginLeft: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontFamily: fonts.subheading,
    fontSize: 14,
    color: colors.ink,
  },
  lockedName: {
    color: colors.inkSecondary,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
    lineHeight: 16,
  },
  dateText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.sage,
    marginTop: 4,
  },
  unlockedTag: {
    backgroundColor: colors.sageLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  unlockedTagText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    color: colors.success,
  },
  lockedTag: {
    backgroundColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  lockedTagText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    color: colors.inkMuted,
  },
});
