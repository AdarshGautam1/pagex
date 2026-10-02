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
import { useRouter, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { colors, fonts, radius, spacing } from '../../constants/theme';

export default function AdminBooksScreen() {
  const router = useRouter();

  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBooks = async () => {
    try {
      const data = await api.getBooks({ limit: 100 });
      setBooks(data.books || []);
    } catch (err) {
      console.warn('Failed to load admin books:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBooks();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBooks();
  }, []);

  const handleTogglePublish = async (book: any) => {
    try {
      const updatedStatus = !book.published;
      await api.updateAdminBook(book.id, { published: updatedStatus });
      setBooks((prev) =>
        prev.map((b) => (b.id === book.id ? { ...b, published: updatedStatus } : b))
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update publishing status.');
    }
  };

  const handleDeleteBook = (book: any) => {
    Alert.alert(
      'Delete Book',
      `Are you sure you want to permanently delete "${book.title}" and its storage files?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAdminBook(book.id);
              setBooks((prev) => prev.filter((b) => b.id !== book.id));
              Alert.alert('Deleted', `"${book.title}" was deleted.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete book.');
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
      <Header
        title="Books"
        subtitle={`${books.length} volumes in library`}
        showBack
        rightAction={
          <Button
            title="+ Add Book"
            size="sm"
            onPress={() => router.push('/(admin)/book-form')}
          />
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {books.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>📚</Text>
            <Text style={styles.emptyTitle}>No books found</Text>
            <Text style={styles.emptySubtitle}>
              Tap the "+ Add Book" button above to upload a new volume.
            </Text>
          </View>
        ) : (
          books.map((book) => (
            <View key={book.id} style={styles.bookCard}>
              <View style={styles.coverThumbWrap}>
                {book.cover_url ? (
                  <Image
                    source={{ uri: book.cover_url }}
                    style={styles.coverThumb}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={styles.placeholderThumb}>
                    <Text style={{ fontSize: 18 }}>📖</Text>
                  </View>
                )}
              </View>

              <View style={styles.bookInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.bookTitle} numberOfLines={1}>
                    {book.title}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleTogglePublish(book)}
                    style={[
                      styles.statusPill,
                      book.published ? styles.publishedPill : styles.draftPill,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        book.published ? styles.publishedPillText : styles.draftPillText,
                      ]}
                    >
                      {book.published ? 'Published' : 'Draft'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.bookAuthor} numberOfLines={1}>
                  {book.author} · {book.categories?.name || 'Uncategorized'}
                </Text>

                <View style={styles.actionRow}>
                  <Text style={styles.pagesText}>{book.page_count} pages</Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteBook(book)}
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
  bookCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  coverThumbWrap: {
    width: 50,
    height: 72,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.border,
    marginRight: spacing.md,
  },
  coverThumb: {
    width: '100%',
    height: '100%',
  },
  placeholderThumb: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookTitle: {
    flex: 1,
    fontFamily: fonts.subheading,
    fontSize: 15,
    color: colors.ink,
    marginRight: spacing.sm,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  publishedPill: {
    backgroundColor: colors.sageLight,
  },
  draftPill: {
    backgroundColor: colors.border,
  },
  statusPillText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
  },
  publishedPillText: {
    color: colors.success,
  },
  draftPillText: {
    color: colors.inkSecondary,
  },
  bookAuthor: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
    marginVertical: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  pagesText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.error,
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
