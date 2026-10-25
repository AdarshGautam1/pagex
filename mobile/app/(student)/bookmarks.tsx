import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { colors, fonts, radius, spacing } from '../../constants/theme';

export default function BookmarksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookmarks = async () => {
    try {
      const data = await api.getBookmarks();
      setBookmarks(data || []);
    } catch (err: any) {
      console.warn('Failed to load bookmarks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookmarks();
  }, []);

  const handleDeleteBookmark = (id: string, pageNum: number) => {
    Alert.alert(
      'Remove Bookmark',
      `Delete saved reference on page ${pageNum}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteBookmark(id);
              setBookmarks((prev) => prev.filter((b) => b.id !== id));
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete bookmark.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xs }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Bookmarks & Annotations</Text>
          <Text style={styles.headerSubtitle}>
            {bookmarks.length} {bookmarks.length === 1 ? 'PASSAGE' : 'PASSAGES'} PRESERVED
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {bookmarks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={48} color={colors.outline} />
            <Text style={styles.emptyTitle}>No Saved Passages</Text>
            <Text style={styles.emptySubtitle}>
              While reading any codex in the archive, tap the bookmark icon to record marginalia and page references.
            </Text>
          </View>
        ) : (
          bookmarks.map((b) => (
            <View key={b.id} style={styles.bookmarkCard}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push(`/(student)/book/${b.book_id}` as any)}
                style={styles.cardContent}
              >
                <View style={styles.pageBadge}>
                  <Text style={styles.pageBadgeText}>p. {b.page_number}</Text>
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.bookTitle} numberOfLines={1}>
                    {b.book?.title || 'Preserved Codex'}
                  </Text>
                  <Text style={styles.bookAuthor} numberOfLines={1}>
                    {b.book?.author || 'Unknown Author'}
                  </Text>
                  {b.note ? <Text style={styles.noteText}>"{b.note}"</Text> : null}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDeleteBookmark(b.id, b.page_number)}
                style={styles.deleteBtn}
              >
                <Ionicons name="trash-outline" size={17} color={colors.inkMuted} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
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
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
  },
  headerSubtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 1,
    marginTop: 2,
  },
  content: {
    padding: spacing.md,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageBadge: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.xs,
    marginRight: spacing.md,
  },
  pageBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.accent,
  },
  infoCol: {
    flex: 1,
  },
  bookTitle: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.ink,
  },
  bookAuthor: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 1,
  },
  noteText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink,
    fontStyle: 'italic',
    marginTop: 3,
  },
  deleteBtn: {
    padding: spacing.xs + 2,
    marginLeft: spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    paddingHorizontal: spacing.xl,
  },
});
