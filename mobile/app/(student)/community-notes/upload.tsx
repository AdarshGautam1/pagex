import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../services/api';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { formatBytes } from '../../../services/downloadManager';
import { colors, fonts, radius, spacing } from '../../../constants/theme';

export default function UploadCommunityNoteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [pickedFile, setPickedFile] = useState<{
    uri: string;
    name: string;
    size?: number;
    mimeType?: string;
  } | null>(null);

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [semester, setSemester] = useState('');
  const [unit, setUnit] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        // 50MB check
        if (file.size && file.size > 50 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select a PDF under 50 MB in size.');
          return;
        }

        setPickedFile({
          uri: file.uri,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType || 'application/pdf',
        });
        setErrors((prev) => ({ ...prev, file: '' }));

        // Pre-fill title if empty from clean filename
        if (!title.trim() && file.name) {
          const cleanName = file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ');
          setTitle(cleanName);
        }
      }
    } catch (err: any) {
      console.warn('Error picking document:', err);
      Alert.alert('Selection Error', 'Failed to pick PDF file. Please try again.');
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!pickedFile) {
      newErrors.file = 'Please choose a PDF file to upload.';
    }
    if (!title.trim()) {
      newErrors.title = 'Title is required.';
    }
    if (!subject.trim()) {
      newErrors.subject = 'Subject is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpload = async () => {
    if (!validateForm()) return;
    if (!pickedFile) return;

    try {
      setUploading(true);

      await api.uploadCommunityNote({
        fileUri: pickedFile.uri,
        fileName: pickedFile.name || 'study-note.pdf',
        mimeType: pickedFile.mimeType || 'application/pdf',
        title: title.trim(),
        subject: subject.trim(),
        semester: semester.trim() || undefined,
        unit: unit.trim() || undefined,
        description: description.trim() || undefined,
      });

      Alert.alert(

        'Upload Successful! 🎉',
        'Your note has been submitted for admin review and will appear in Community Notes once approved.',
        [
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      console.error('Upload error:', err);
      Alert.alert('Upload Failed', err.message || 'Unable to upload community note.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) + spacing.xs }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="close" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Upload Study PDF</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* PDF File Picker Box */}
        <Text style={styles.sectionHeader}>PDF DOCUMENT *</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handlePickDocument}
          style={[
            styles.dropZone,
            pickedFile ? styles.dropZoneSelected : null,
            errors.file ? styles.dropZoneError : null,
          ]}
        >
          {pickedFile ? (
            <View style={styles.pickedFileRow}>
              <View style={styles.pdfIconWrap}>
                <Ionicons name="document-text" size={28} color={colors.accent} />
              </View>
              <View style={styles.pickedFileInfo}>
                <Text style={styles.pickedFileName} numberOfLines={1}>
                  {pickedFile.name}
                </Text>
                <Text style={styles.pickedFileSize}>
                  {pickedFile.size ? formatBytes(pickedFile.size) : 'Ready for upload'} · PDF
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPickedFile(null)}
                style={styles.removeFileBtn}
              >
                <Ionicons name="close-circle" size={20} color={colors.inkSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.dropZonePrompt}>
              <View style={styles.cloudIconWrap}>
                <Ionicons name="cloud-upload" size={32} color={colors.accent} />
              </View>
              <Text style={styles.dropZoneTitle}>Choose PDF Document</Text>
              <Text style={styles.dropZoneSub}>Maximum file size: 50 MB</Text>
            </View>
          )}
        </TouchableOpacity>
        {errors.file ? <Text style={styles.errorText}>{errors.file}</Text> : null}

        {/* Note Metadata Fields */}
        <View style={styles.formSection}>
          <Input
            label="NOTE TITLE *"
            placeholder="e.g. Data Structures & Algorithms Summary"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
            }}
            error={errors.title}
          />

          <Input
            label="SUBJECT / TOPIC *"
            placeholder="e.g. Computer Science, Physics, Organic Chemistry"
            value={subject}
            onChangeText={(text) => {
              setSubject(text);
              if (errors.subject) setErrors((prev) => ({ ...prev, subject: '' }));
            }}
            error={errors.subject}
          />

          <View style={styles.twoColumnRow}>
            <View style={{ flex: 1 }}>
              <Input
                label="SEMESTER (OPTIONAL)"
                placeholder="e.g. 3, Fall 2026"
                value={semester}
                onChangeText={setSemester}
              />
            </View>
            <View style={{ width: spacing.md }} />
            <View style={{ flex: 1 }}>
              <Input
                label="UNIT / MODULE (OPTIONAL)"
                placeholder="e.g. Unit 2"
                value={unit}
                onChangeText={setUnit}
              />
            </View>
          </View>

          <Input
            label="DESCRIPTION (OPTIONAL)"
            placeholder="Add brief notes on chapters covered or study tips..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />
        </View>

        {/* Informational Guidance Box */}
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark" size={18} color={colors.accent} />
          <Text style={styles.infoText}>
            Community notes are reviewed by admins before appearing in the shared feed. Only valid study and lecture PDFs are accepted.
          </Text>
        </View>

        {/* Submit Button */}
        <Button
          title={uploading ? 'Uploading PDF...' : 'Submit Note for Review'}
          onPress={handleUpload}
          loading={uploading}
          style={styles.submitBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  sectionHeader: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.inkSecondary,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  dropZone: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    marginBottom: spacing.md,
  },
  dropZoneSelected: {
    borderStyle: 'solid',
    borderColor: colors.accent,
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  dropZoneError: {
    borderColor: colors.error,
  },
  dropZonePrompt: {
    alignItems: 'center',
  },
  cloudIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  dropZoneTitle: {
    fontFamily: fonts.subheading,
    fontSize: 15,
    color: colors.ink,
    marginTop: 4,
  },
  dropZoneSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  pickedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  pdfIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  pickedFileInfo: {
    flex: 1,
  },
  pickedFileName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
  },
  pickedFileSize: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  removeFileBtn: {
    padding: spacing.xs,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.error,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  formSection: {
    marginTop: spacing.sm,
  },
  twoColumnRow: {
    flexDirection: 'row',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.accentSubtle,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(122, 48, 48, 0.15)',
  },
  infoText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.accent,
    lineHeight: 18,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
});
