import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChipSelect from './ChipSelect';
import { typography, spacing, borderRadius, shadows } from '../styles/theme';
import { useSettings } from '../context/SettingsContext';

const activityTypes = [
  { value: 'attraction', label: 'Attraction', emoji: '🏛' },
  { value: 'food', label: 'Food', emoji: '🍜' },
  { value: 'shopping', label: 'Shopping', emoji: '🛍' },
  { value: 'transport', label: 'Transport', emoji: '🚃' },
  { value: 'hotel', label: 'Hotel', emoji: '🏨' },
];

export default function EditActivityModal({ visible, activity, onSave, onDelete, onClose }) {
  const { colors } = useSettings();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    title: '',
    time: '',
    duration: '',
    location: { name: '', lat: 0, lng: 0 },
    cost: 0,
    description: '',
    type: 'attraction',
  });

  useEffect(() => {
    if (activity) {
      setForm({
        title: activity.title || '',
        time: activity.time || '',
        duration: activity.duration || '',
        location: activity.location || { name: '', lat: 0, lng: 0 },
        cost: activity.cost || 0,
        description: activity.description || '',
        type: activity.type || 'attraction',
      });
    }
  }, [activity]);

  const handleSave = () => {
    if (!form.title.trim()) {
      Alert.alert('Required', 'Please enter a title');
      return;
    }
    onSave({ ...activity, ...form });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Activity',
      `Remove "${form.title}" from your itinerary?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(activity) },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>
              {activity?._id ? 'Edit Activity' : 'Add Activity'}
            </Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Title</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
              value={form.title}
              onChangeText={(title) => setForm({ ...form, title })}
              placeholder="Activity name"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Time</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
              value={form.time}
              onChangeText={(time) => setForm({ ...form, time })}
              placeholder="09:00"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Duration</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
              value={form.duration}
              onChangeText={(duration) => setForm({ ...form, duration })}
              placeholder="2 hours"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Location</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
              value={form.location?.name || ''}
              onChangeText={(name) => setForm({ ...form, location: { ...form.location, name } })}
              placeholder="Area name"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Estimated Cost</Text>
            <View style={[styles.costInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.costSymbol, { color: colors.textSecondary }]}>$</Text>
              <TextInput
                style={[styles.costValue, { color: colors.textPrimary }]}
                keyboardType="numeric"
                value={String(form.cost || '')}
                onChangeText={(text) => setForm({ ...form, cost: parseInt(text) || 0 })}
                placeholder="0"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border }]}
              value={form.description}
              onChangeText={(description) => setForm({ ...form, description })}
              placeholder="Brief description..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={styles.label}>Type</Text>
            <ChipSelect
              options={activityTypes}
              selected={form.type}
              onSelect={(type) => setForm({ ...form, type })}
            />

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>

            {activity?._id && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
                <Text style={[styles.deleteText, { color: colors.error }]}>Delete Activity</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headingL,
    marginBottom: spacing.xxl,
  },
  label: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    height: 48,
    ...typography.body,
  },
  textArea: {
    height: 80,
    paddingTop: spacing.md,
  },
  costInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    height: 48,
  },
  costSymbol: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  costValue: {
    flex: 1,
    ...typography.body,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  cancelText: {
    ...typography.body,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
  },
  saveText: {
    ...typography.button,
  },
  deleteBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxl,
    paddingVertical: spacing.md,
  },
  deleteText: {
    ...typography.body,
  },
});
