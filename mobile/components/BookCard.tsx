import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts, radius, spacing } from '../constants/theme';

export interface BookItem {
  id: string;
  title: string;
  author: string;
  page_count: number;
  cover_url?: string | null;
  cover_path?: string | null;
  categories?: { id: string; name: string } | null;
}

interface BookCardProps {
  book: BookItem;
  onPress: () => void;
  layout?: 'grid' | 'horizontal';
  style?: ViewStyle;
}

export function BookCard({
  book,
  onPress,
  layout = 'grid',
  style,
}: BookCardProps) {
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [book.cover_url]);

  if (layout === 'horizontal') {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[styles.horizontalCard, style]}
      >
        <View style={styles.horizontalCoverWrap}>
          {book.cover_url && !imageError ? (
            <Image
              source={{ uri: book.cover_url }}
              style={styles.horizontalCover}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.placeholderCover}>
              <Text style={styles.placeholderText}>📖</Text>
            </View>
          )}
        </View>

        <View style={styles.horizontalInfo}>
          {book.categories?.name && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{book.categories.name}</Text>
            </View>
          )}
          <Text style={styles.title} numberOfLines={2}>
            {book.title}
          </Text>
          <Text style={styles.author} numberOfLines={1}>
            {book.author}
          </Text>
          <Text style={styles.pagesText}>{book.page_count} pages</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.gridCard, style]}
    >
      <View style={styles.gridCoverWrap}>
        {book.cover_url && !imageError ? (
          <Image
            source={{ uri: book.cover_url }}
            style={styles.gridCover}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.placeholderCover}>
            <Text style={styles.placeholderText}>📖</Text>
          </View>
        )}
      </View>
      <View style={styles.gridInfo}>
        <Text style={styles.gridTitle} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={styles.gridAuthor} numberOfLines={1}>
          {book.author}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  horizontalCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  horizontalCoverWrap: {
    width: 65,
    height: 95,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  horizontalCover: {
    width: '100%',
    height: '100%',
  },
  horizontalInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.sageLight,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginBottom: 4,
  },
  tagText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.sage,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fonts.subheading,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 20,
  },
  author: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  pagesText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 4,
  },
  gridCard: {
    width: 140,
    marginRight: spacing.md,
    marginBottom: spacing.md,
  },
  gridCoverWrap: {
    width: 140,
    height: 200,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceActive,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridCover: {
    width: '100%',
    height: '100%',
  },
  gridInfo: {
    marginTop: spacing.xs + 2,
  },
  gridTitle: {
    fontFamily: fonts.subheading,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 18,
  },
  gridAuthor: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceActive,
  },
  placeholderText: {
    fontSize: 32,
  },
});
