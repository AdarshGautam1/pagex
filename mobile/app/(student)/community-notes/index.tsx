import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import {
  checkOfflineAvailability,
  downloadPdfForOffline,
  deleteLocalDownload,
  formatBytes,
} from '../../../services/downloadManager';
import { colors, fonts, radius, spacing } from '../../../constants/theme';

export interface CommunityNoteItem {
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

export default function CommunityNotesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'all' | 'my_notes'>('all');
  const [notes, setNotes] = useState<CommunityNoteItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Download states tracked by note ID: progress percent (number) or boolean
  const [downloadStates, setDownloadStates] = useState<Record<string, { isDownloaded: boolean; progress?: number }>>({});

  const fetchNotes = async () => {
    try {
      const isMyNotes = activeTab === 'my_notes';
      const data = await api.getCommunityNotes({
        search: searchQuery.trim() || undefined,
        subject: subjectFilter.trim() || undefined,
        my_notes: isMyNotes,
        limit: 50,
      });

      const items = (data.notes || []) as CommunityNoteItem[];
      setNotes(items);

      // Check offline availability for all loaded notes
      const states: Record<string, { isDownloaded: boolean }> = {};
      await Promise.all(
        items.map(async (n) => {
          const res = await checkOfflineAvailability(n.id, 'note');
          states[n.id] = { isDownloaded: res.isAvailable };
        })
      );
      setDownloadStates(states);
    } catch (err: any) {
      console.warn('Failed to load community notes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotes();
    }, [activeTab, searchQuery, subjectFilter])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotes();
  }, [activeTab, searchQuery, subjectFilter]);

  const handleDownload = async (note: CommunityNoteItem) => {
    try {
      setDownloadStates((prev) => ({
        ...prev,
        [note.id]: { isDownloaded: false, progress: 0 },
      }));

      await downloadPdfForOffline(
        note.id,
        'note',
        note.title,
        async () => {
          const detail = await api.getCommunityNoteDetail(note.id);
          return detail.pdf_url;
        },
        (progress) => {
          setDownloadStates((prev) => ({
            ...prev,
            [note.id]: { isDownloaded: false, progress },
          }));
        }
      );

      setDownloadStates((prev) => ({
        ...prev,
        [note.id]: { isDownloaded: true, progress: undefined },
      }));

      Alert.alert('Saved Offline', `"${note.title}" is now available offline.`);
    } catch (err: any) {
      setDownloadStates((prev) => ({
        ...prev,
        [note.id]: { isDownloaded: false, progress: undefined },
      }));
      Alert.alert('Download Failed', err.message || 'Unable to download note for offline reading.');
    }
  };

  const handleDelete = (note: CommunityNoteItem) => {
    Alert.alert(
      'Delete Note',
      `Are you sure you want to delete "${note.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteCommunityNote(note.id);
              await deleteLocalDownload(note.id, 'note').catch(() => {});
              setNotes((prev) => prev.filter((n) => n.id !== note.id));
              Alert.alert('Deleted', 'Community note removed.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete note.');
            }
          },
        },
      ]
    );
  };

  const handleOpenNote = (note: CommunityNoteItem) => {
    router.push({
      pathname: '/(student)/reader/[id]',
      params: { id: note.id, type: 'note', title: note.title },
    } as any);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#E8ECE6' }]}>
            <Ionicons name="checkmark-circle" size={12} color={colors.success} />
            <Text style={[styles.statusText, { color: colors.success }]}>Approved</Text>
          </View>
        );
      case 'rejected':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FCEBEB' }]}>
            <Ionicons name="close-circle" size={12} color={colors.error} />
            <Text style={[styles.statusText, { color: colors.error }]}>Rejected</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FFF5E6' }]}>
            <Ionicons name="time" size={12} color={colors.gold} />
            <Text style={[styles.statusText, { color: colors.gold }]}>Pending Review</Text>
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
          <Text style={styles.topBarTitle}>Community Notes</Text>
          <Text style={styles.topBarSubtitle}>Peer-shared study PDFs & summaries</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(student)/community-notes/upload' as any)}
          style={styles.uploadNavBtn}
        >
          <Ionicons name="cloud-upload-outline" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Tabs: All Notes / My Uploads */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveTab('all')}
          style={[styles.tabButton, activeTab === 'all' && styles.activeTabButton]}
        >
          <Ionicons
            name="library-outline"
            size={16}
            color={activeTab === 'all' ? colors.accent : colors.inkSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All Notes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveTab('my_notes')}
          style={[styles.tabButton, activeTab === 'my_notes' && styles.activeTabButton]}
        >
          <Ionicons
            name="person-outline"
            size={16}
            color={activeTab === 'my_notes' ? colors.accent : colors.inkSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'my_notes' && styles.activeTabText]}>
            My Uploads
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search & Subject Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.inkSecondary} />
          <TextInput
            placeholder="Search notes by title or keyword..."
            placeholderTextColor={colors.inkMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.inkSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Notes List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading community notes...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 80 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
        >
          {/* Prominent Upload CTA Card */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(student)/community-notes/upload' as any)}
            style={styles.ctaCard}
          >
            <View style={styles.ctaIconWrap}>
              <Ionicons name="document-text" size={24} color={colors.accent} />
            </View>
            <View style={styles.ctaInfo}>
              <Text style={styles.ctaTitle}>Share Your Study Notes</Text>
              <Text style={styles.ctaSubtitle}>
                Upload summaries or lecture PDFs for fellow students
              </Text>
            </View>
            <View style={styles.ctaButton}>
              <Ionicons name="add" size={20} color={colors.white} />
              <Text style={styles.ctaButtonText}>Upload</Text>
            </View>
          </TouchableOpacity>

          {notes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📝</Text>
              <Text style={styles.emptyTitle}>
                {activeTab === 'my_notes' ? 'No uploads yet' : 'No community notes found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'my_notes'
                  ? 'Contribute your study guides or summaries by tapping "+ Upload Note".'
                  : 'Be the first to share notes or try clearing your search filter.'}
              </Text>
            </View>
          ) : (
            notes.map((note) => {
              const isOwner = note.user_id === profile?.id;
              const dlState = downloadStates[note.id];
              const isDownloaded = dlState?.isDownloaded;
              const isDownloading = dlState?.progress !== undefined && !isDownloaded;

              return (
                <View key={note.id} style={styles.noteCard}>
                  {/* Card Header: Subject, Status & Date */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.subjectBadge}>
                      <Text style={styles.subjectBadgeText}>{note.subject}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {renderStatusBadge(note.status)}
                      {isDownloaded && (
                        <View style={styles.offlineBadge}>
                          <Ionicons name="cloud-done" size={12} color={colors.success} />
                          <Text style={styles.offlineBadgeText}>Offline</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Title & Description */}
                  <Text style={styles.noteTitle}>{note.title}</Text>
                  {note.description ? (
                    <Text style={styles.noteDesc} numberOfLines={2}>
                      {note.description}
                    </Text>
                  ) : null}

                  {/* Metadata Row: Uploader, Semester, Unit, Size */}
                  <View style={styles.metadataRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="person-circle-outline" size={14} color={colors.inkSecondary} />
                      <Text style={styles.metaText}>
                        {note.profiles?.display_name || 'Student'}
                      </Text>
                    </View>
                    {note.semester && (
                      <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={13} color={colors.inkSecondary} />
                        <Text style={styles.metaText}>Sem {note.semester}</Text>
                      </View>
                    )}
                    {note.unit && (
                      <View style={styles.metaItem}>
                        <Ionicons name="bookmark-outline" size={13} color={colors.inkSecondary} />
                        <Text style={styles.metaText}>Unit {note.unit}</Text>
                      </View>
                    )}
                    {note.file_size ? (
                      <View style={styles.metaItem}>
                        <Ionicons name="document-attach-outline" size={13} color={colors.inkSecondary} />
                        <Text style={styles.metaText}>{formatBytes(note.file_size)}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Actions Row */}
                  <View style={styles.actionsRow}>
                    {/* Read / Open Button */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleOpenNote(note)}
                      style={styles.openBtn}
                    >
                      <Ionicons name="book-outline" size={16} color={colors.white} />
                      <Text style={styles.openBtnText}>Open</Text>
                    </TouchableOpacity>

                    {/* Download Button */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled={isDownloaded || isDownloading}
                      onPress={() => handleDownload(note)}
                      style={[
                        styles.downloadBtn,
                        isDownloaded && styles.downloadBtnActive,
                      ]}
                    >
                      {isDownloading ? (
                        <>
                          <ActivityIndicator size="small" color={colors.accent} />
                          <Text style={styles.downloadBtnText}>
                            {dlState?.progress || 0}%
                          </Text>
                        </>
                      ) : isDownloaded ? (
                        <>
                          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                          <Text style={[styles.downloadBtnText, { color: colors.success }]}>
                            Available Offline
                          </Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="download-outline" size={16} color={colors.ink} />
                          <Text style={styles.downloadBtnText}>Download</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {/* Owner Delete Button */}
                    {isOwner && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleDelete(note)}
                        style={styles.deleteBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                      </TouchableOpacity>
                    )}
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: spacing.xs,
  },
  topBarCenter: {
    flex: 1,
    marginHorizontal: spacing.sm,
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
  uploadNavBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.xs,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.lg,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: 6,
    borderRadius: radius.md,
  },
  activeTabButton: {
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
    color: colors.accent,
  },
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    marginLeft: spacing.sm,
    padding: 0,
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
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ctaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  ctaInfo: {
    flex: 1,
    marginRight: spacing.xs,
  },
  ctaTitle: {
    fontFamily: fonts.subheading,
    fontSize: 15,
    color: colors.ink,
  },
  ctaSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    gap: 2,
  },
  ctaButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.white,
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
  noteCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  subjectBadge: {
    backgroundColor: colors.accentSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  subjectBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    gap: 4,
  },
  statusText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    textTransform: 'capitalize',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8ECE6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    gap: 3,
  },
  offlineBadgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.success,
  },
  noteTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.ink,
    marginTop: 2,
  },
  noteDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSecondary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 206, 196, 0.4)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  openBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: 6,
  },
  openBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.white,
  },
  downloadBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  downloadBtnActive: {
    backgroundColor: '#F0F5EE',
    borderColor: colors.success,
  },
  downloadBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.ink,
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
