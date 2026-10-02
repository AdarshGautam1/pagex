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
import { api } from '../../services/api';
import { Header } from '../../components/Header';
import { colors, fonts, radius, spacing } from '../../constants/theme';

export default function BookmarksScreen() {
  const router = useRouter();

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
      'Delete Bookmark',
      `Are you sure you want to remove the bookmark on page ${pageNum}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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
    <View style={styles.container}>
      <Header title="Bookmarks" showBack />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {bookmarks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>🔖</Text>
            <Text style={styles.emptyTitle}>No saved bookmarks yet</Text>
            <Text style={styles.emptySubtitle}>
              While reading any book in the PDF reader, tap the bookmark icon to save your place.
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
                    {b.book?.title || 'Unknown Book'}
                  </Text>
                  <Text style={styles.bookAuthor} numberOfLines={1}>
                    {b.book?.author || ''}
                  </Text>
                  {b.note ? <Text style={styles.noteText}>"{b.note}"</Text> : null}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDeleteBookmark(b.id, b.page_number)}
                style={styles.deleteBtn}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
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
  bookmarkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
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
    backgroundColor: colors.accentSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginRight: spacing.md,
  },
  pageBadgeText: {
    fontFamily: fonts.subheading,
    fontSize: 13,
    color: colors.accent,
  },
  infoCol: {
    flex: 1,
  },
  bookTitle: {
    fontFamily: fonts.subheading,
    fontSize: 15,
    color: colors.ink,
  },
  bookAuthor: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  noteText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink,
    fontStyle: 'italic',
    marginTop: 4,
  },
  deleteBtn: {
    padding: spacing.sm,
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
    lineHeight: 18,
    paddingHorizontal: spacing.xl,
  },
});
