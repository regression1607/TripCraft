import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { typography, spacing, borderRadius } from '../styles/theme';
import { useSettings } from '../context/SettingsContext';

export default function ChipSelect({ options, selected, onSelect, multiSelect = false }) {
  const { colors } = useSettings();
  const handlePress = (value) => {
    if (multiSelect) {
      if (selected.includes(value)) {
        onSelect(selected.filter((v) => v !== value));
      } else {
        onSelect([...selected, value]);
      }
    } else {
      onSelect(value);
    }
  };

  const isSelected = (value) => {
    if (multiSelect) return selected.includes(value);
    return selected === value;
  };

  return (
    <View style={styles.container}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.chip,
            { backgroundColor: colors.card, borderColor: colors.border },
            isSelected(option.value) && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
          ]}
          onPress={() => handlePress(option.value)}
          activeOpacity={0.7}
        >
          {option.emoji && <Text style={styles.emoji}>{option.emoji}</Text>}
          <Text style={[styles.label, isSelected(option.value) && { color: colors.primary }]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
});
