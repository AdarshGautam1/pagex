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
import { api } from '../../services/api';
import { Header } from '../../components/Header';
import { colors, fonts, radius, spacing } from '../../constants/theme';

const ACTION_FILTERS = ['ALL', 'PDF_ACCESS', 'BOOK_CREATED', 'BOOK_UPDATED', 'BOOK_DELETED'];

export default function AdminAuditScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    try {
      const data = await api.getAdminAudit({
        action: selectedAction !== 'ALL' ? selectedAction : undefined,
        limit: 50,
      });
      setLogs(data.logs || []);
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedAction]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLogs();
  }, [selectedAction]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'PDF_ACCESS':
        return colors.sage;
      case 'BOOK_CREATED':
        return colors.success;
      case 'BOOK_UPDATED':
        return colors.gold;
      case 'BOOK_DELETED':
        return colors.error;
      default:
        return colors.inkSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Audit Trail"
        subtitle="Security & compliance access logs"
        showBack
      />

      {/* Filter Tabs */}
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {ACTION_FILTERS.map((act) => {
            const isSelected = selectedAction === act;
            return (
              <TouchableOpacity
                key={act}
                onPress={() => setSelectedAction(act)}
                style={[styles.filterPill, isSelected && styles.selectedFilterPill]}
              >
                <Text style={[styles.filterPillText, isSelected && styles.selectedFilterText]}>
                  {act}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {logs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>🛡️</Text>
            <Text style={styles.emptyTitle}>No audit events recorded</Text>
            <Text style={styles.emptySubtitle}>
              Events such as PDF reading sessions, book creations, and deletions appear here automatically.
            </Text>
          </View>
        ) : (
          logs.map((log) => {
            const dateStr = new Date(log.created_at).toLocaleString();
            const actionColor = getActionColor(log.action);

            return (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.cardHeader}>
                  <View style={[styles.actionBadge, { backgroundColor: `${actionColor}20` }]}>
                    <Text style={[styles.actionBadgeText, { color: actionColor }]}>
                      {log.action}
                    </Text>
                  </View>
                  <Text style={styles.timestamp}>{dateStr}</Text>
                </View>

                <Text style={styles.userInfo}>
                  User: {log.profiles?.display_name || log.user_id || 'System'}
                </Text>

                {log.entity_type && (
                  <Text style={styles.entityText}>
                    Target: {log.entity_type} ({log.entity_id})
                  </Text>
                )}

                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <View style={styles.metaBox}>
                    <Text style={styles.metaJson}>
                      {JSON.stringify(log.metadata, null, 2)}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
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
  filterWrap: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs + 2,
  },
  filterPill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedFilterPill: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterPillText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.inkSecondary,
  },
  selectedFilterText: {
    color: colors.white,
  },
  logCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  actionBadgeText: {
    fontFamily: fonts.subheading,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  timestamp: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
  },
  userInfo: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.ink,
    marginTop: 2,
  },
  entityText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  metaBox: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
    marginTop: spacing.xs + 2,
  },
  metaJson: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontFamily: fonts.subheading,
    fontSize: 18,
    color: colors.ink,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: spacing.xl,
  },
});
