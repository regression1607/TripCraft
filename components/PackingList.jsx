import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { typography, spacing, borderRadius, shadows } from '../styles/theme';
import { useSettings } from '../context/SettingsContext';

export default function PackingList({ packingList, onToggleItem, onAddItem, onDeleteItem }) {
  const { colors } = useSettings();
  const [newItemText, setNewItemText] = useState('');
  const [addingCategory, setAddingCategory] = useState(null);

  const totalItems = packingList?.reduce((sum, cat) => sum + (cat.items?.length || 0), 0) || 0;
  const packedItems = packingList?.reduce(
    (sum, cat) => sum + (cat.items?.filter((i) => i.packed)?.length || 0), 0
  ) || 0;

  const handleAdd = (categoryIndex) => {
    if (!newItemText.trim()) return;
    onAddItem?.(categoryIndex, newItemText.trim());
    setNewItemText('');
    setAddingCategory(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Packing List</Text>
          <Text style={styles.subtitle}>AI-suggested items</Text>
        </View>
        <Text style={[styles.progress, { color: colors.primary }]}>{packedItems}/{totalItems} packed</Text>
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            { width: totalItems > 0 ? `${(packedItems / totalItems) * 100}%` : '0%', backgroundColor: colors.success },
          ]}
        />
      </View>

      {packingList?.map((category, catIdx) => (
        <View key={catIdx} style={styles.category}>
          <Text style={styles.categoryTitle}>{category.category}</Text>
          <View style={[styles.categoryCard, { backgroundColor: colors.card }]}>
            {category.items?.map((item, itemIdx) => (
              <View key={itemIdx} style={styles.item}>
                <TouchableOpacity
                  style={styles.itemLeft}
                  onPress={() => onToggleItem?.(catIdx, itemIdx)}
                >
                  <Ionicons
                    name={item.packed ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={item.packed ? colors.success : colors.textMuted}
                  />
                  <Text
                    style={[styles.itemText, item.packed && { textDecorationLine: 'line-through', color: colors.textMuted }]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onDeleteItem?.(catIdx, itemIdx)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}

            {addingCategory === catIdx ? (
              <View style={[styles.addRow, { borderTopColor: colors.border }]}>
                <TextInput
                  style={styles.addInput}
                  placeholder="Item name..."
                  placeholderTextColor={colors.textMuted}
                  value={newItemText}
                  onChangeText={setNewItemText}
                  autoFocus
                  onSubmitEditing={() => handleAdd(catIdx)}
                />
                <TouchableOpacity onPress={() => handleAdd(catIdx)}>
                  <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAddingCategory(null)}>
                  <Ionicons name="close-circle" size={28} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.addButton, { borderTopColor: colors.border }]}
                onPress={() => setAddingCategory(catIdx)}
              >
                <Ionicons name="add" size={18} color={colors.secondary} />
                <Text style={[styles.addText, { color: colors.secondary }]}>Add item</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headingL,
  },
  subtitle: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  progress: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: spacing.xxl,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  category: {
    marginBottom: spacing.xl,
  },
  categoryTitle: {
    ...typography.body,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  categoryCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  itemText: {
    ...typography.body,
    flex: 1,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    marginTop: spacing.sm,
  },
  addInput: {
    flex: 1,
    ...typography.body,
    height: 40,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  addText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
});
