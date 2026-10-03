import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../services/api';
import { Button } from '../../../components/Button';
import {
  checkOfflineAvailability,
  downloadPdfForOffline,
} from '../../../services/downloadManager';
import { colors, fonts, radius, spacing } from '../../../constants/theme';


export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [book, setBook] = useState<any>(null);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOfflineAvailable, setIsOfflineAvailable] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);


  const fetchBook = async () => {
    if (!id) return;
    try {
      const data = await api.getBookDetail(id);
      setBook(data.book);
      setUserProgress(data.user_progress);

      // Check offline availability
      const offline = await checkOfflineAvailability(id, 'book');
      setIsOfflineAvailable(offline.isAvailable);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load book details.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadOffline = async () => {
    if (!book || !id) return;
    try {
      setDownloadProgress(0);
      await downloadPdfForOffline(
        id,
        'book',
        book.title,
        async () => {
          const res = await api.startReading(id);
          return res.pdf_url;
        },
        (progress) => {
          setDownloadProgress(progress);
        }
      );
      setIsOfflineAvailable(true);
      setDownloadProgress(null);
      Alert.alert('Downloaded', `"${book.title}" is now available offline.`);
    } catch (err: any) {
      setDownloadProgress(null);
      Alert.alert('Download Error', err.message || 'Failed to download book for offline reading.');
    }
  };

  useEffect(() => {
    fetchBook();
  }, [id]);


  if (loading || !book) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const hasBookmarks = userProgress?.bookmarks && userProgress.bookmarks.length > 0;

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) + spacing.xs }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>{book.title}</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/(student)/bookmarks')}
          style={styles.bookmarkBtn}
        >
          <Ionicons
            name={hasBookmarks ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={colors.accent}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + Math.max(insets.bottom, 24) }]}>
        {/* Cover Image Presentation */}
        <View style={styles.coverWrapper}>
          {book.cover_url ? (
            <Image
              source={{ uri: book.cover_url }}
              style={styles.coverImage}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.placeholderCover}>
              <Text style={{ fontSize: 60 }}>📖</Text>
            </View>
          )}
        </View>

        {/* Title & Metadata */}
        <View style={styles.metadataSection}>
          {book.categories?.name && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{book.categories.name}</Text>
            </View>
          )}

          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>by {book.author}</Text>

          <View style={styles.specsRow}>
            <View style={styles.specItem}>
              <Ionicons name="document-text-outline" size={16} color={colors.inkSecondary} />
              <Text style={styles.specText}>{book.page_count} pages</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specItem}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
              <Text style={styles.specText}>Secure Protected PDF</Text>
            </View>
          </View>
        </View>

        {/* User Reading Progress Banner */}
        {userProgress && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Ionicons
                name={userProgress.is_completed ? 'checkmark-circle' : 'time-outline'}
                size={20}
                color={userProgress.is_completed ? colors.success : colors.accent}
              />
              <Text style={styles.progressTitle}>
                {userProgress.is_completed
                  ? 'Qualified Read Completed'
                  : userProgress.total_seconds_read > 0
                  ? 'Reading In Progress'
                  : 'Not Started'}
              </Text>
            </View>
            <Text style={styles.progressText}>
              Total reading time: {Math.round((userProgress.total_seconds_read || 0) / 60)} minutes
            </Text>
          </View>
        )}

        {/* Synopsis / Description */}
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionHeading}>Synopsis</Text>
          <Text style={styles.descriptionText}>
            {book.description || 'No description provided for this volume.'}
          </Text>
        </View>

        {/* Saved Bookmarks on this book */}
        {hasBookmarks && (
          <View style={styles.bookmarksSection}>
            <Text style={styles.sectionHeading}>Your Bookmarks on this Book</Text>
            {userProgress.bookmarks.map((b: any) => (
              <View key={b.id} style={styles.bookmarkItem}>
                <View style={styles.bookmarkPageBadge}>
                  <Text style={styles.bookmarkPageText}>p. {b.page_number}</Text>
                </View>
                <Text style={styles.bookmarkNote}>
                  {b.note || 'Saved marker'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 24) + spacing.sm }]}>
        <View style={styles.bottomBarRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={isOfflineAvailable || downloadProgress !== null}
            onPress={handleDownloadOffline}
            style={[
              styles.offlineDownloadBtn,
              isOfflineAvailable && styles.offlineDownloadBtnActive,
            ]}
          >
            {downloadProgress !== null ? (
              <>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.offlineBtnText}>{downloadProgress}%</Text>
              </>
            ) : isOfflineAvailable ? (
              <>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={[styles.offlineBtnText, { color: colors.success }]}>Offline Ready</Text>
              </>
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color={colors.ink} />
                <Text style={styles.offlineBtnText}>Download</Text>
              </>
            )}
          </TouchableOpacity>

          <Button
            title="📖  Read Now"
            onPress={() =>
              router.push({
                pathname: `/(student)/reader/[id]`,
                params: { id: book.id, type: 'book', title: book.title },
              } as any)
            }
            style={styles.readButton}
          />
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
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
  topBarTitle: {
    flex: 1,
    marginHorizontal: spacing.sm,
    fontFamily: fonts.subheading,
    fontSize: 16,
    color: colors.ink,
    textAlign: 'center',
  },
  bookmarkBtn: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  coverWrapper: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  coverImage: {
    width: 180,
    height: 260,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeholderCover: {
    width: 180,
    height: 260,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  metadataSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  categoryBadge: {
    backgroundColor: colors.sageLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  categoryText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.sage,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.ink,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  author: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkSecondary,
    marginTop: 4,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  specText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.inkSecondary,
  },
  progressCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  progressTitle: {
    fontFamily: fonts.subheading,
    fontSize: 14,
    color: colors.ink,
  },
  progressText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSecondary,
  },
  descriptionSection: {
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    fontFamily: fonts.subheading,
    fontSize: 16,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  descriptionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSecondary,
    lineHeight: 22,
  },
  bookmarksSection: {
    marginBottom: spacing.lg,
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  bookmarkPageBadge: {
    backgroundColor: colors.accentSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
  },
  bookmarkPageText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.accent,
  },
  bookmarkNote: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  offlineDownloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  offlineDownloadBtnActive: {
    backgroundColor: '#F0F5EE',
    borderColor: colors.success,
  },
  offlineBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.ink,
  },
  readButton: {
    flex: 1.6,
  },
});

