import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../services/api';
import { Header } from '../../components/Header';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors, fonts, radius, spacing } from '../../constants/theme';

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BookFormScreen() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [pageCount, setPageCount] = useState('20');
  const [published, setPublished] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  const [pdfFile, setPdfFile] = useState<{
    uri: string;
    name: string;
    size?: number;
    mimeType?: string;
  } | null>(null);

  const [coverFile, setCoverFile] = useState<{
    uri: string;
    base64?: string | null;
    fileName?: string | null;
    mimeType?: string;
    fileSize?: number;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      try {
        setLoadingCategories(true);
        const data = await api.getAdminCategories();
        if (data?.categories) {
          setCategories(data.categories);
        }
      } catch (err) {
        console.warn('Failed to fetch categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    }
    loadCategories();
  }, []);

  const handlePickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPdfFile({
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType || 'application/pdf',
        });
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to pick document: ' + (err.message || 'Unknown error'));
    }
  };

  const handlePickCover = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Needed',
          'Access to your photo gallery is required to choose a book cover image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setCoverFile({
          uri: asset.uri,
          base64: asset.base64 || null,
          fileName: asset.fileName || 'cover.jpg',
          mimeType: asset.mimeType || 'image/jpeg',
          fileSize: asset.fileSize,
        });
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to pick cover image: ' + (err.message || 'Unknown error'));
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Book title is required.');
      return;
    }

    if (!author.trim()) {
      Alert.alert('Validation Error', 'Author name is required.');
      return;
    }

    if (!pdfFile) {
      Alert.alert('Validation Error', 'Please select a PDF document for this book.');
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('author', author.trim());

      if (description.trim()) {
        formData.append('description', description.trim());
      }

      if (selectedCategory) {
        formData.append('category_id', selectedCategory);
      }

      formData.append('page_count', pageCount.trim() || '20');
      formData.append('published', String(published));

      // 1. Convert PDF file URI to standard Blob for modern Expo/React Native fetch
      const pdfResponse = await fetch(pdfFile.uri);
      let pdfBlob = await pdfResponse.blob();
      const pdfMime = pdfFile.mimeType || 'application/pdf';
      if (!pdfBlob.type || pdfBlob.type === 'application/octet-stream') {
        pdfBlob = new Blob([pdfBlob], { type: pdfMime });
      }
      formData.append('pdf', pdfBlob, pdfFile.name || 'document.pdf');

      // 2. Attach Cover artwork if selected (sent cleanly as base64)
      if (coverFile?.base64) {
        formData.append('cover_base64', coverFile.base64);
        formData.append('cover_filename', coverFile.fileName || 'cover.jpg');
        formData.append('cover_mimetype', coverFile.mimeType || 'image/jpeg');
      }

      await api.createAdminBook(formData);

      Alert.alert(
        'Book Uploaded!',
        `"${title.trim()}" has been successfully uploaded to the Supabase library catalog and storage.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Failed to upload book.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Add New Book" showBack />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* PDF File Picker (Required) */}
        <View style={styles.sectionWrap}>
          <Text style={styles.fieldLabel}>BOOK PDF DOCUMENT *</Text>
          {pdfFile ? (
            <View style={styles.selectedFileCard}>
              <View style={styles.fileIconWrap}>
                <Ionicons name="document-text" size={24} color={colors.accent} />
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {pdfFile.name}
                </Text>
                <Text style={styles.fileMeta}>
                  {formatFileSize(pdfFile.size)} · PDF ready to upload
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPdfFile(null)}
                style={styles.fileRemoveBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={22} color={colors.inkMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.pickerBox}
              onPress={handlePickPdf}
              activeOpacity={0.7}
            >
              <View style={styles.pickerIconCircle}>
                <Ionicons name="cloud-upload-outline" size={24} color={colors.accent} />
              </View>
              <Text style={styles.pickerTitle}>Select PDF Document</Text>
              <Text style={styles.pickerSubtitle}>Tap to browse device storage (.pdf, up to 50MB)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Cover Image Picker (Optional) */}
        <View style={styles.sectionWrap}>
          <Text style={styles.fieldLabel}>COVER ARTWORK (OPTIONAL)</Text>
          {coverFile ? (
            <View style={styles.selectedCoverCard}>
              <Image
                source={{ uri: coverFile.uri }}
                style={styles.coverThumbnail}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {coverFile.fileName || 'Cover Artwork'}
                </Text>
                <Text style={styles.fileMeta}>Image attached</Text>
              </View>
              <TouchableOpacity
                onPress={() => setCoverFile(null)}
                style={styles.fileRemoveBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={22} color={colors.inkMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.pickerBox}
              onPress={handlePickCover}
              activeOpacity={0.7}
            >
              <View style={[styles.pickerIconCircle, { backgroundColor: 'rgba(114, 122, 104, 0.12)' }]}>
                <Ionicons name="image-outline" size={24} color={colors.sage} />
              </View>
              <Text style={styles.pickerTitle}>Choose Cover Artwork</Text>
              <Text style={styles.pickerSubtitle}>Select from photo gallery (.jpg, .png)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Book Title */}
        <Input
          label="BOOK TITLE *"
          placeholder="e.g. Structure and Interpretation of Computer Programs"
          value={title}
          onChangeText={setTitle}
        />

        {/* Author */}
        <Input
          label="AUTHOR *"
          placeholder="e.g. Harold Abelson & Gerald Jay Sussman"
          value={author}
          onChangeText={setAuthor}
        />

        {/* Category Selector */}
        {categories.length > 0 && (
          <View style={styles.sectionWrap}>
            <Text style={styles.fieldLabel}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategory(isSelected ? null : cat.id)}
                    style={[styles.categoryPill, isSelected && styles.selectedCategoryPill]}
                    activeOpacity={0.7}
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
        )}

        {/* Estimated Pages */}
        <Input
          label="ESTIMATED PAGES"
          keyboardType="number-pad"
          value={pageCount}
          onChangeText={setPageCount}
        />

        {/* Description */}
        <Input
          label="DESCRIPTION / SYNOPSIS"
          placeholder="A brief overview of the volume..."
          multiline
          numberOfLines={4}
          style={{ height: 90, textAlignVertical: 'top' }}
          value={description}
          onChangeText={setDescription}
        />

        {/* Publish Immediately Switch */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text style={styles.switchLabel}>Publish Immediately</Text>
            <Text style={styles.switchSublabel}>
              Make available in the student library catalog right away
            </Text>
          </View>
          <Switch
            value={published}
            onValueChange={setPublished}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.white}
          />
        </View>

        {/* Submit Button */}
        <Button
          title={submitting ? 'Uploading to Supabase...' : 'Save & Publish Volume'}
          onPress={handleSubmit}
          loading={submitting}
          style={{ marginTop: spacing.lg }}
        />
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
    paddingBottom: spacing.xxl + 40,
  },
  sectionWrap: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontFamily: fonts.subheading,
    fontSize: 11,
    color: colors.inkSecondary,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  pickerBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: 'rgba(184, 93, 25, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  pickerTitle: {
    fontFamily: fonts.subheading,
    fontSize: 14,
    color: colors.ink,
    marginTop: 2,
  },
  pickerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  selectedFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  selectedCoverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  coverThumbnail: {
    width: 48,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  fileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(184, 93, 25, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  fileName: {
    fontFamily: fonts.subheading,
    fontSize: 13,
    color: colors.ink,
  },
  fileMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  fileRemoveBtn: {
    padding: spacing.xs,
  },
  categoryScroll: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.xs,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.sm,
  },
  switchLabel: {
    fontFamily: fonts.subheading,
    fontSize: 14,
    color: colors.ink,
  },
  switchSublabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 2,
  },
});
