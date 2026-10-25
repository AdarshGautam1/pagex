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
        <Text style={[styles.label, highlight && styles.highlightLabel]}>{label}</Text>
        {icon}
      </View>
      <Text style={[styles.value, highlight && styles.highlightValue]}>
        {value}
      </Text>
      {subtext && (
        <Text style={[styles.subtext, highlight && styles.highlightSubtext]}>
          {subtext}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  highlightLabel: {
    color: colors.accent,
  },
  value: {
    fontFamily: fonts.headingBold,
    fontSize: 26,
    color: colors.ink,
    marginTop: spacing.xs,
    letterSpacing: -0.3,
  },
  highlightValue: {
    color: colors.accent,
  },
  subtext: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  highlightSubtext: {
    color: colors.inkSecondary,
  },
});
