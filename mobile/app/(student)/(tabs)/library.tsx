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
  { id: '', name: 'All Volumes' },
  { id: 'Philosophy', name: 'Philosophy' },
  { id: 'Science', name: 'Science' },
  { id: 'History', name: 'History' },
  { id: 'Technology', name: 'Technology' },
  { id: 'Literature', name: 'Literature' },
  { id: 'Psychology', name: 'Psychology' },
];

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [books, setBooks] = useState<BookItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
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
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Library Catalogue</Text>
          <Text style={styles.headerSubtitle}>
            {books.length} {books.length === 1 ? 'Volume' : 'Volumes'} In Archive
          </Text>
        </View>

        <View style={styles.vaultPill}>
          <View style={styles.vaultDot} />
          <Text style={styles.vaultText}>Vault Active</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.inkSecondary} />
        <TextInput
          placeholder="Search by title, author, or keyword..."
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

      {/* Quick Collection Drawers */}
      <View style={styles.collectionStrip}>
        <TouchableOpacity
          style={styles.collectionChip}
          onPress={() => router.push('/(student)/bookmarks')}
        >
          <Ionicons name="bookmark" size={14} color={colors.accent} />
          <Text style={styles.collectionChipText}>Bookmarks</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.collectionChip, { backgroundColor: colors.secondaryContainer }]}
          onPress={() => router.push('/(student)/downloads' as any)}
        >
          <Ionicons name="cloud-done-outline" size={14} color={colors.onSecondaryContainer} />
          <Text style={[styles.collectionChipText, { color: colors.onSecondaryContainer }]}>
            Offline Ready
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.collectionChip}
          onPress={() => router.push('/(student)/community-notes' as any)}
        >
          <Ionicons name="document-text-outline" size={14} color={colors.inkSecondary} />
          <Text style={styles.collectionChipText}>Notes</Text>
        </TouchableOpacity>
      </View>

      {/* Categories Horizontal Filter Pills */}
      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
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

      {/* Shelf Control Toolbar: Count & Grid/List Switcher */}
      <View style={styles.toolbar}>
        <Text style={styles.toolbarCount}>
          SHOWING {books.length} {books.length === 1 ? 'ENTRY' : 'ENTRIES'}
        </Text>

        <View style={styles.layoutToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, layoutMode === 'grid' && styles.toggleBtnActive]}
            onPress={() => setLayoutMode('grid')}
            accessibilityLabel="Grid View"
          >
            <Ionicons
              name="grid-outline"
              size={16}
              color={layoutMode === 'grid' ? colors.accent : colors.inkMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, layoutMode === 'list' && styles.toggleBtnActive]}
            onPress={() => setLayoutMode('list')}
            accessibilityLabel="List View"
          >
            <Ionicons
              name="list-outline"
              size={16}
              color={layoutMode === 'list' ? colors.accent : colors.inkMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Books Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 100 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          {books.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={48} color={colors.outline} />
              <Text style={styles.emptyTitle}>No Volumes Found</Text>
              <Text style={styles.emptySubtitle}>
                No archival records match your filter criteria.
              </Text>
            </View>
          ) : layoutMode === 'grid' ? (
            <View style={styles.booksGrid}>
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  layout="grid"
                  onPress={() => router.push(`/(student)/book/${book.id}` as any)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.booksList}>
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  layout="horizontal"
                  onPress={() => router.push(`/(student)/book/${book.id}` as any)}
                />
              ))}
            </View>
          )}

          {/* Archival Reading Quote Divider */}
          <View style={styles.quoteSection}>
            <View style={styles.quoteRule} />
            <Text style={styles.quoteText}>
              "A library is not a luxury but one of the necessities of life."
            </Text>
            <Text style={styles.quoteAuthor}>— HENRY WARD BEECHER</Text>
          </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.outline,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  vaultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vaultDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
  vaultText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.inkSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  collectionStrip: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  collectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  collectionChipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.inkSecondary,
  },
  categoriesContainer: {
    marginVertical: spacing.xs + 2,
  },
  categoryScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs + 2,
  },
  categoryPill: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.sm, // Rectangular 4px radius as per Stitch design
  },
  selectedCategoryPill: {
    backgroundColor: colors.ink,
  },
  categoryPillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.inkSecondary,
    letterSpacing: 0.2,
  },
  selectedCategoryPillText: {
    color: '#FFFFFF',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toolbarCount: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.outline,
    letterSpacing: 0.8,
  },
  layoutToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.sm,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  booksList: {
    gap: 2,
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
    marginTop: 4,
    textAlign: 'center',
  },
  quoteSection: {
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  quoteRule: {
    width: 48,
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  quoteText: {
    fontFamily: fonts.displayItalic,
    fontSize: 15,
    color: colors.ink,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  quoteAuthor: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 1.2,
    marginTop: spacing.xs,
  },
});
