import React, { useState, useCallback } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getStorageUsageReport,
  deleteLocalDownload,
  formatBytes,
} from '../../services/downloadManager';
import { DownloadRecord } from '../../services/sqlite';
import { colors, fonts, radius, spacing } from '../../constants/theme';

export default function DownloadsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [report, setReport] = useState<{
    totalBytes: number;
    bookBytes: number;
    noteBytes: number;
    totalCount: number;
    books: DownloadRecord[];
    notes: DownloadRecord[];
  }>({
    totalBytes: 0,
    bookBytes: 0,
    noteBytes: 0,
    totalCount: 0,
    books: [],
    notes: [],
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDownloads = async () => {
    try {
      const data = await getStorageUsageReport();
      setReport(data);
    } catch (err) {
      console.warn('Failed to load downloads:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDownloads();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDownloads();
  }, []);

  const handleDelete = (item: DownloadRecord) => {
    Alert.alert(
      'Delete Offline Copy',
      `Delete "${item.title}" from your device storage? You can download it again anytime when online.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLocalDownload(item.content_id, item.content_type);
              await loadDownloads();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete offline file.');
            }
          },
        },
      ]
    );
  };

  const handleOpen = (item: DownloadRecord) => {
    router.push({
      pathname: '/(student)/reader/[id]',
      params: {
        id: item.content_id,
        type: item.content_type,
        title: item.title,
      },
    } as any);
  };

  const renderDownloadItem = (item: DownloadRecord) => (
    <View key={`${item.content_type}_${item.content_id}`} style={styles.itemCard}>
      <View style={styles.itemIconWrap}>
        <Ionicons
          name={item.content_type === 'book' ? 'book' : 'document-text'}
          size={22}
          color={colors.accent}
        />
      </View>

      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.itemMetaRow}>
          <Text style={styles.itemMetaText}>{formatBytes(item.file_size)}</Text>
          <Text style={styles.itemMetaDot}>·</Text>
          <Text style={styles.itemMetaText}>
            Page {item.last_opened_page || 1}
          </Text>
          <Text style={styles.itemMetaDot}>·</Text>
          <Text style={styles.itemMetaText}>
            {new Date(item.downloaded_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.itemActions}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleOpen(item)}
          style={styles.openBtn}
        >
          <Text style={styles.openBtnText}>Open</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleDelete(item)}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

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
          <Text style={styles.topBarTitle}>Downloads & Offline</Text>
          <Text style={styles.topBarSubtitle}>Local cached PDFs for offline reading</Text>
        </View>
      </View>

      {/* Storage Used Banner */}
      <View style={styles.storageBanner}>
        <View style={styles.storageIconWrap}>
          <Ionicons name="cloud-offline" size={26} color={colors.accent} />
        </View>
        <View style={styles.storageInfo}>
          <Text style={styles.storageLabel}>DEVICE STORAGE USED</Text>
          <Text style={styles.storageValue}>
            {formatBytes(report.totalBytes)}
          </Text>
          <Text style={styles.storageSub}>
            {report.books.length} Books · {report.notes.length} Community Notes
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Checking local storage...</Text>
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
          {report.totalCount === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💾</Text>
              <Text style={styles.emptyTitle}>No downloads yet</Text>
              <Text style={styles.emptySubtitle}>
                Download books from the Library or notes from Community Notes to read without an internet connection.
              </Text>
              <View style={styles.emptyButtonsRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/(student)/(tabs)/library' as any)}
                  style={styles.emptyBtn}
                >
                  <Ionicons name="library-outline" size={16} color={colors.white} />
                  <Text style={styles.emptyBtnText}>Explore Library</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/(student)/community-notes' as any)}
                  style={[styles.emptyBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
                >
                  <Ionicons name="document-text-outline" size={16} color={colors.ink} />
                  <Text style={[styles.emptyBtnText, { color: colors.ink }]}>Community Notes</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Section: Downloaded Books */}
              {report.books.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Downloaded Books</Text>
                    <Text style={styles.sectionCount}>{report.books.length}</Text>
                  </View>
                  {report.books.map(renderDownloadItem)}
                </View>
              )}

              {/* Section: Downloaded Notes */}
              {report.notes.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Downloaded Community Notes</Text>
                    <Text style={styles.sectionCount}>{report.notes.length}</Text>
                  </View>
                  {report.notes.map(renderDownloadItem)}
                </View>
              )}
            </>
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
  storageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  storageIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  storageInfo: {
    flex: 1,
  },
  storageLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.inkSecondary,
    letterSpacing: 0.5,
  },
  storageValue: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.accent,
    marginTop: 1,
  },
  storageSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.lg,
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
  emptyButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    gap: 6,
  },
  emptyBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.white,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fonts.subheading,
    fontSize: 15,
    color: colors.ink,
  },
  sectionCount: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.accent,
    backgroundColor: colors.accentSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  itemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  itemTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  itemMetaText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkSecondary,
  },
  itemMetaDot: {
    marginHorizontal: 4,
    color: colors.inkMuted,
    fontSize: 10,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  openBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radius.md,
  },
  openBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.white,
  },
  deleteBtn: {
    padding: spacing.xs + 3,
    borderRadius: radius.md,
    backgroundColor: '#FDF2F2',
    borderWidth: 1,
    borderColor: '#F8D7DA',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
