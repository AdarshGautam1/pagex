import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, fonts, radius, spacing } from '../constants/theme';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
  highlight?: boolean;
}

export function StatCard({
  label,
  value,
  subtext,
  icon,
  style,
  highlight = false,
}: StatCardProps) {
  return (
    <View
      style={[
        styles.card,
        highlight && styles.highlightCard,
        style,
      ]}
    >
      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>
        {icon}
      </View>
      <Text style={[styles.value, highlight && styles.highlightValue]}>
        {value}
      </Text>
      {subtext && <Text style={styles.subtext}>{subtext}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  highlightCard: {
    backgroundColor: colors.accentSubtle,
    borderColor: colors.accentLight,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.inkSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.ink,
    marginTop: spacing.xs,
  },
  highlightValue: {
    color: colors.accent,
  },
  subtext: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
});
