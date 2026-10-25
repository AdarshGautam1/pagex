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
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);

  const fetchBook = async () => {
    if (!id) return;
    try {
      const data = await api.getBookDetail(id);
      setBook(data.book);
      setUserProgress(data.user_progress);

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
      Alert.alert('Downloaded', `"${book.title}" is now available offline in your sandbox.`);
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
  const lastPage = userProgress?.last_page || 1;
  const progressPercent = Math.min(
    100,
    Math.round(((lastPage || 1) / Math.max(1, book.page_count || 1)) * 100)
  );

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) + spacing.xs }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.topBarTitleWrap}>
          <Text style={styles.topBarTitle} numberOfLines={1}>{book.title}</Text>
          <Text style={styles.topBarSubtitle}>ARCHIVAL ENTRY</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/(student)/bookmarks')}
          style={styles.bookmarkBtn}
        >
          <Ionicons
            name={hasBookmarks ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={colors.accent}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 110 + Math.max(insets.bottom, 20) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Presentation Stage */}
        <View style={styles.presentationCard}>
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
                <Ionicons name="book-outline" size={48} color={colors.accent} />
              </View>
            )}
            {/* Tactile Book Spine Edge Shadow */}
            <View style={styles.spineRibbonShadow} />
          </View>

          {/* Classification & Metadata */}
          <View style={styles.presentationDetails}>
            {book.categories?.name && (
              <View style={styles.categoryPill}>
                <View style={styles.categoryDot} />
                <Text style={styles.categoryText}>{book.categories.name}</Text>
              </View>
            )}

            <Text style={styles.bookTitle}>{book.title}</Text>
            <Text style={styles.bookAuthor}>by {book.author}</Text>
            <Text style={styles.bookFormat}>
              Oxford University Press • Modern Translation • {book.page_count} Pages
            </Text>

            {/* Security Pill */}
            <View style={styles.securityPill}>
              <Ionicons name="shield-checkmark" size={13} color={colors.secondary} />
              <Text style={styles.securityText}>Verified PDF • Watermarked & DRM Protected</Text>
            </View>
          </View>
        </View>

        {/* Reading Journey Progress Spine */}
        {userProgress && (
          <View style={styles.journeyCard}>
            <View style={styles.journeyHeader}>
              <View style={styles.journeyTitleWrap}>
                <Ionicons name="book-outline" size={18} color={colors.accent} />
                <Text style={styles.journeyTitle}>Your Reading Journey</Text>
              </View>
              <Text style={styles.journeyPercent}>{progressPercent}% Finished</Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>

            <View style={styles.journeyPagesRow}>
              <Text style={styles.journeyPagesText}>
                Page {lastPage} of {book.page_count}
              </Text>
              <Text style={styles.journeyPagesText}>
                {Math.max(0, (book.page_count || 0) - lastPage)} pages remaining
              </Text>
            </View>

            <View style={styles.journeyStatsGrid}>
              <View style={styles.journeyStatCell}>
                <Text style={styles.journeyStatLabel}>TOTAL TIME</Text>
                <Text style={styles.journeyStatVal}>
                  {Math.round((userProgress.total_seconds_read || 0) / 60)} mins
                </Text>
              </View>
              <View style={styles.journeyStatCell}>
                <Text style={styles.journeyStatLabel}>STATUS</Text>
                <Text style={[styles.journeyStatVal, { color: colors.secondary }]}>
                  {userProgress.is_completed ? 'Completed' : 'In Progress'}
                </Text>
              </View>
              <View style={styles.journeyStatCell}>
                <Text style={styles.journeyStatLabel}>BOOKMARKS</Text>
                <Text style={styles.journeyStatVal}>
                  {userProgress.bookmarks?.length || 0} Saved
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Curatorial Synopsis */}
        <View style={styles.synopsisCard}>
          <View style={styles.synopsisHeader}>
            <Text style={styles.synopsisTitle}>Curatorial Synopsis</Text>
            <Text style={styles.synopsisCirca}>ARCHIVE CODEX</Text>
          </View>
          <Text
            style={styles.synopsisBody}
            numberOfLines={synopsisExpanded ? undefined : 4}
          >
            {book.description ||
              'A preserved volume in the PAGEX digital library. Dedicated to scholarly immersion, textual analysis, and deep comprehension over superficial skimming.'}
          </Text>
          {book.description && book.description.length > 140 && (
            <TouchableOpacity
              style={styles.expandBtn}
              onPress={() => setSynopsisExpanded(!synopsisExpanded)}
            >
              <Text style={styles.expandBtnText}>
                {synopsisExpanded ? 'Collapse synopsis' : 'Read full synopsis'}
              </Text>
              <Ionicons
                name={synopsisExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.accent}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Supplementary Materials: Community Notes & Bookmarks */}
        {hasBookmarks && (
          <View style={styles.bookmarksSection}>
            <View style={styles.bookmarksHeader}>
              <Ionicons name="bookmark" size={16} color={colors.accent} />
              <Text style={styles.bookmarksTitle}>Saved Annotations on this Book</Text>
            </View>
            {userProgress.bookmarks.map((b: any) => (
              <View key={b.id} style={styles.bookmarkItem}>
                <View style={styles.bookmarkPageBadge}>
                  <Text style={styles.bookmarkPageText}>p. {b.page_number}</Text>
                </View>
                <Text style={styles.bookmarkNote}>
                  {b.note || 'Saved reference marker'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footnote Preservation Seal */}
        <View style={styles.sealWrap}>
          <Text style={styles.sealTitle}>PAGEX ARCHIVE REF • NO. {book.id?.slice(0, 12)?.toUpperCase()}</Text>
          <Text style={styles.sealSubtitle}>Authorized for personal, authenticated research review.</Text>
        </View>
      </ScrollView>

      {/* Persistent Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) + spacing.xs }]}>
        <View style={styles.bottomBarRow}>
          {/* Offline Download Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={isOfflineAvailable || downloadProgress !== null}
            onPress={handleDownloadOffline}
            style={[
              styles.offlineBtn,
              isOfflineAvailable && styles.offlineBtnActive,
            ]}
          >
            {downloadProgress !== null ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : isOfflineAvailable ? (
              <Ionicons name="cloud-done" size={20} color={colors.secondary} />
            ) : (
              <Ionicons name="cloud-download-outline" size={20} color={colors.inkSecondary} />
            )}
            <Text
              style={[
                styles.offlineBtnText,
                isOfflineAvailable && { color: colors.secondary },
              ]}
            >
              {isOfflineAvailable ? 'Offline' : 'Save'}
            </Text>
          </TouchableOpacity>

          {/* Primary Action Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.readBtn}
            onPress={() => router.push(`/(student)/reader/${book.id}` as any)}
          >
            <View style={styles.readBtnLeft}>
              <Ionicons name="book" size={18} color="#FFFFFF" />
              <Text style={styles.readBtnText}>
                {userProgress?.last_page && userProgress.last_page > 1
                  ? `Resume p. ${userProgress.last_page}`
                  : 'Open Codex & Read'}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
          </TouchableOpacity>
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

  /* Top Bar */
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
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  topBarTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.ink,
  },
  topBarSubtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  bookmarkBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },

  /* Presentation Stage */
  presentationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  coverWrapper: {
    width: 140,
    height: 210, // 2:3 ratio
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  spineRibbonShadow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 8,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  presentationDetails: {
    alignItems: 'center',
    marginTop: spacing.md,
    maxWidth: 320,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
  categoryText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.inkSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bookTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 22,
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  bookAuthor: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  bookFormat: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.outline,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.xs,
    marginTop: spacing.sm,
  },
  securityText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.secondary,
    letterSpacing: 0.3,
  },

  /* Journey Card */
  journeyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  journeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  journeyTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  journeyTitle: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.ink,
  },
  journeyPercent: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.accent,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceContainer,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  journeyPagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  journeyPagesText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.outline,
  },
  journeyStatsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  journeyStatCell: {
    flex: 1,
    alignItems: 'center',
  },
  journeyStatLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 0.6,
  },
  journeyStatVal: {
    fontFamily: fonts.headingBold,
    fontSize: 14,
    color: colors.ink,
    marginTop: 2,
  },

  /* Synopsis */
  synopsisCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  synopsisHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  synopsisTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.ink,
  },
  synopsisCirca: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 0.8,
  },
  synopsisBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSecondary,
    lineHeight: 22,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs + 2,
  },
  expandBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.accent,
  },

  /* Bookmarks */
  bookmarksSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bookmarksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  bookmarksTitle: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.ink,
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  bookmarkPageBadge: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  bookmarkPageText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.accent,
  },
  bookmarkNote: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink,
  },

  /* Seal */
  sealWrap: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  sealTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 1.2,
  },
  sealSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkSecondary,
    marginTop: 2,
  },

  /* Bottom Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  bottomBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  offlineBtn: {
    width: 60,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  offlineBtnActive: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondary,
  },
  offlineBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.inkSecondary,
    textTransform: 'uppercase',
  },
  readBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  readBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  readBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
