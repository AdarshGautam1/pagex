import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { formatBytes } from '../../services/downloadManager';
import { colors, fonts, radius, spacing } from '../../constants/theme';

export interface AdminNoteItem {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  subject: string;
  semester: string | null;
  unit: string | null;
  file_name: string;
  file_size: number | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export default function AdminCommunityNotesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [notes, setNotes] = useState<AdminNoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchNotes = async () => {
    try {
      const data = await api.getAdminCommunityNotes({
        status: activeTab,
        limit: 50,
      });
      setNotes((data.notes || []) as AdminNoteItem[]);
    } catch (err: any) {
      console.warn('Failed to load admin community notes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchNotes();
  }, [activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotes();
  }, [activeTab]);

  const handleApprove = async (note: AdminNoteItem) => {
    try {
      setActionLoadingId(note.id);
      await api.approveAdminCommunityNote(note.id);
      // Remove from pending list or update in place
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      Alert.alert('Approved', `"${note.title}" is now approved and visible to students.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to approve note.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (note: AdminNoteItem) => {
    try {
      setActionLoadingId(note.id);
      await api.rejectAdminCommunityNote(note.id);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      Alert.alert('Rejected', `"${note.title}" has been marked as rejected.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reject note.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = (note: AdminNoteItem) => {
    Alert.alert(
      'Delete Note Permanently',
      `Are you sure you want to permanently delete "${note.title}" and its storage file?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoadingId(note.id);
              await api.deleteAdminCommunityNote(note.id);
              setNotes((prev) => prev.filter((n) => n.id !== note.id));
              Alert.alert('Deleted', 'Community note permanently removed.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete note.');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const handlePreview = (note: AdminNoteItem) => {
    router.push({
      pathname: '/(student)/reader/[id]',
      params: { id: note.id, type: 'note', title: note.title },
    } as any);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <View style={[styles.badge, { backgroundColor: '#E8ECE6' }]}>
            <Text style={[styles.badgeText, { color: colors.success }]}>Approved</Text>
          </View>
        );
      case 'rejected':
        return (
          <View style={[styles.badge, { backgroundColor: '#FCEBEB' }]}>
            <Text style={[styles.badgeText, { color: colors.error }]}>Rejected</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.badge, { backgroundColor: '#FFF5E6' }]}>
            <Text style={[styles.badgeText, { color: colors.gold }]}>Pending Review</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) + spacing.xs }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>Manage Community Notes</Text>
          <Text style={styles.topBarSubtitle}>Review student uploads & governance</Text>
        </View>
      </View>

      {/* Filter Tabs: Pending, Approved, Rejected */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveTab('pending')}
          style={[styles.tabBtn, activeTab === 'pending' && styles.activeTabBtn]}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={activeTab === 'pending' ? colors.accent : colors.inkSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveTab('approved')}
          style={[styles.tabBtn, activeTab === 'approved' && styles.activeTabBtn]}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={16}
            color={activeTab === 'approved' ? colors.success : colors.inkSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'approved' && styles.activeTabText]}>
            Approved
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveTab('rejected')}
          style={[styles.tabBtn, activeTab === 'rejected' && styles.activeTabBtn]}
        >
          <Ionicons
            name="close-circle-outline"
            size={16}
            color={activeTab === 'rejected' ? colors.error : colors.inkSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'rejected' && styles.activeTabText]}>
            Rejected
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Fetching notes for review...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 40 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
        >
          {notes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No {activeTab} notes</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'pending'
                  ? 'No community notes are currently waiting for admin moderation.'
                  : `No notes found in the ${activeTab} category.`}
              </Text>
            </View>
          ) : (
            notes.map((note) => {
              const isActionRunning = actionLoadingId === note.id;

              return (
                <View key={note.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.subjectTag}>
                      <Text style={styles.subjectTagText}>{note.subject}</Text>
                    </View>
                    {renderStatusBadge(note.status)}
                  </View>

                  <Text style={styles.title}>{note.title}</Text>
                  {note.description ? (
                    <Text style={styles.desc}>{note.description}</Text>
                  ) : null}

                  {/* Details metadata */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>UPLOADER</Text>
                      <Text style={styles.metaVal}>
                        {note.profiles?.display_name || 'Student'} (@{note.profiles?.username || 'user'})
                      </Text>
                    </View>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>DATE</Text>
                      <Text style={styles.metaVal}>
                        {new Date(note.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>SIZE</Text>
                      <Text style={styles.metaVal}>
                        {note.file_size ? formatBytes(note.file_size) : 'PDF'}
                      </Text>
                    </View>
                  </View>

                  {/* Actions Bar */}
                  <View style={styles.actionsBar}>
                    {/* Preview Button */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handlePreview(note)}
                      style={styles.previewBtn}
                    >
                      <Ionicons name="eye-outline" size={16} color={colors.ink} />
                      <Text style={styles.previewBtnText}>Preview</Text>
                    </TouchableOpacity>

                    {/* Approve Button */}
                    {note.status !== 'approved' && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        disabled={isActionRunning}
                        onPress={() => handleApprove(note)}
                        style={styles.approveBtn}
                      >
                        <Ionicons name="checkmark" size={16} color={colors.white} />
                        <Text style={styles.actionBtnText}>Approve</Text>
                      </TouchableOpacity>
                    )}

                    {/* Reject Button */}
                    {note.status !== 'rejected' && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        disabled={isActionRunning}
                        onPress={() => handleReject(note)}
                        style={styles.rejectBtn}
                      >
                        <Ionicons name="close" size={16} color={colors.white} />
                        <Text style={styles.actionBtnText}>Reject</Text>
                      </TouchableOpacity>
                    )}

                    {/* Delete Button */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      disabled={isActionRunning}
                      onPress={() => handleDelete(note)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  topBarCenter: {
    flex: 1,
  },
  topBarTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
  },
  topBarSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.xs,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.lg,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: 6,
    borderRadius: radius.md,
  },
  activeTabBtn: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.inkSecondary,
  },
  activeTabText: {
    fontFamily: fonts.bodySemiBold,
    color: colors.ink,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSecondary,
    marginTop: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
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
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  subjectTag: {
    backgroundColor: colors.accentSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  subjectTagText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.ink,
    marginTop: 2,
  },
  desc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSecondary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 206, 196, 0.4)',
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.inkMuted,
    letterSpacing: 0.5,
  },
  metaVal: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink,
    marginTop: 2,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: 4,
  },
  previewBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.ink,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: 4,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: 4,
  },
  actionBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.white,
  },
  deleteBtn: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#FDF2F2',
    borderWidth: 1,
    borderColor: '#F8D7DA',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
