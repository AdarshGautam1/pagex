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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { colors, fonts, radius, spacing } from '../../constants/theme';

export default function AdminCategoriesScreen() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      const data = await api.getAdminCategories();
      setCategories(data.categories || []);
    } catch (err) {
      console.warn('Failed to load categories:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCategories();
  }, []);

  const handleCreateCategory = async () => {
    if (!nameInput.trim()) {
      Alert.alert('Validation Error', 'Category name is required.');
      return;
    }

    try {
      setSaving(true);
      await api.createAdminCategory({
        name: nameInput.trim(),
        description: descInput.trim() || undefined,
      });

      setCategories((prev) => [
        ...prev,
        { id: Date.now().toString(), name: nameInput.trim(), description: descInput.trim() },
      ]);

      setModalVisible(false);
      setNameInput('');
      setDescInput('');
      Alert.alert('Success', 'Category created successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = (cat: any) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete the category "${cat.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (cat.id && cat.id.length > 5) {
                await api.deleteAdminCategory(cat.id);
              }
              setCategories((prev) => prev.filter((c) => c.name !== cat.name));
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete category.');
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
        title="Categories"
        subtitle={`${categories.length} active genres`}
        showBack
        rightAction={
          <Button
            title="+ New"
            size="sm"
            onPress={() => setModalVisible(true)}
          />
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {categories.map((cat) => (
          <View key={cat.id || cat.name} style={styles.catCard}>
            <View style={styles.catInfo}>
              <Text style={styles.catName}>{cat.name}</Text>
              <Text style={styles.catDesc}>{cat.description || 'No description'}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDeleteCategory(cat)}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* New Category Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Category</Text>
            <Text style={styles.modalSubtitle}>Create a new literary genre or academic topic.</Text>

            <Input
              label="CATEGORY NAME"
              placeholder="e.g. Mathematics"
              value={nameInput}
              onChangeText={setNameInput}
            />

            <Input
              label="DESCRIPTION (OPTIONAL)"
              placeholder="e.g. Pure and applied mathematics"
              value={descInput}
              onChangeText={setDescInput}
            />

            <View style={styles.modalButtonsRow}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
              <View style={{ width: spacing.sm }} />
              <Button
                title="Create"
                variant="primary"
                onPress={handleCreateCategory}
                loading={saving}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  catCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  catInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  catName: {
    fontFamily: fonts.subheading,
    fontSize: 16,
    color: colors.ink,
  },
  catDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  deleteBtn: {
    padding: spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.background,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
});
