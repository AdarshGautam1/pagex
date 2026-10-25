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
  progress_percent?: number;
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
          {/* Tactile Book Spine Edge Shadow */}
          <View style={styles.spineHighlight} />
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
          <View style={styles.metaRow}>
            <Text style={styles.pagesText}>{book.page_count} pages</Text>
            {typeof book.progress_percent === 'number' && book.progress_percent > 0 && (
              <Text style={styles.progressText}>{book.progress_percent}% read</Text>
            )}
          </View>
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
        {/* Tactile Book Spine Edge Shadow */}
        <View style={styles.spineHighlight} />
      </View>
      <View style={styles.gridInfo}>
        <Text style={styles.gridTitle} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={styles.gridAuthor} numberOfLines={1}>
          {book.author}
        </Text>
        <Text style={styles.gridPages}>{book.page_count}p</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  horizontalCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  horizontalCoverWrap: {
    width: 68,
    height: 102, // 2:3 aspect ratio
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceHigh,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  horizontalCover: {
    width: '100%',
    height: '100%',
  },
  spineHighlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 5,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  horizontalInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.xs,
    marginBottom: 4,
  },
  tagText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.inkSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.ink,
    lineHeight: 22,
  },
  author: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  pagesText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
  },
  progressText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.accent,
  },
  gridCard: {
    width: 140,
    marginRight: spacing.md,
    marginBottom: spacing.md,
  },
  gridCoverWrap: {
    width: 140,
    height: 210, // 2:3 aspect ratio
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  gridCover: {
    width: '100%',
    height: '100%',
  },
  gridInfo: {
    marginTop: spacing.xs + 4,
  },
  gridTitle: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 19,
  },
  gridAuthor: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  gridPages: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
  },
  placeholderText: {
    fontSize: 32,
  },
});
