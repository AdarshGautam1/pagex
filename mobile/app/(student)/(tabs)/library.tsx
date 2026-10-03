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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../services/api';
import { BookCard, BookItem } from '../../../components/BookCard';
import { colors, fonts, radius, spacing } from '../../../constants/theme';

const CATEGORIES = [
  { id: '', name: 'All' },
  { id: 'Fiction', name: 'Fiction' },
  { id: 'Science', name: 'Science' },
  { id: 'History', name: 'History' },
  { id: 'Technology', name: 'Technology' },
  { id: 'Philosophy', name: 'Philosophy' },
  { id: 'Self-Help', name: 'Self-Help' },
];

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [books, setBooks] = useState<BookItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBooks = async () => {
    try {
      const data = await api.getBooks({
        q: searchQuery,
        limit: 50,
      });

      let filtered = data.books || [];
      if (selectedCategory) {
        filtered = filtered.filter(
          (b) => b.categories?.name?.toLowerCase() === selectedCategory.toLowerCase()
        );
      }
      setBooks(filtered);
    } catch (err) {
      console.warn('Failed to load library books:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [searchQuery, selectedCategory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBooks();
  }, [searchQuery, selectedCategory]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Library</Text>
          <Text style={styles.headerSubtitle}>Explore the curated digital catalogue</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(student)/community-notes' as any)}
            style={styles.headerNavBtn}
          >
            <Ionicons name="document-text-outline" size={18} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(student)/downloads' as any)}
            style={styles.headerNavBtn}
          >
            <Ionicons name="cloud-offline-outline" size={18} color={colors.success} />
          </TouchableOpacity>
        </View>
      </View>


      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.inkSecondary} />
        <TextInput
          placeholder="Search by title or author..."
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

      {/* Categories Filter Pills */}
      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.name}
                activeOpacity={0.7}
                onPress={() => setSelectedCategory(cat.id)}
                style={[styles.categoryPill, isSelected && styles.selectedCategoryPill]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.selectedCategoryPillText,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Books Grid */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.gridContent,
            { paddingBottom: 110 + insets.bottom },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          {books.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📚</Text>
              <Text style={styles.emptyTitle}>No books found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search query or category filter.
              </Text>
            </View>
          ) : (
            <View style={styles.booksWrap}>
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  layout="grid"
                  onPress={() => router.push(`/(student)/book/${book.id}` as any)}
                />
              ))}
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  headerNavBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {

    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 44,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  categoriesContainer: {
    marginBottom: spacing.md,
  },
  categoryScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs + 2,
  },
  categoryPill: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedCategoryPill: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  categoryPillText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.inkSecondary,
  },
  selectedCategoryPillText: {
    color: colors.white,
  },
  gridContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  booksWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.subheading,
    fontSize: 16,
    color: colors.ink,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});
