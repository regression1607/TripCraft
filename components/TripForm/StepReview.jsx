import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, borderRadius, shadows } from '../../styles/theme';
import { useSettings } from '../../context/SettingsContext';

export default function StepReview({ data, onChange }) {
  const { colors } = useSettings();
  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const items = [
    { icon: 'location', text: `${data.destination?.name || 'Not set'}${data.destination?.country ? ', ' + data.destination.country : ''}` },
    { icon: 'calendar', text: `${formatDate(data.arrivalDate)} - ${formatDate(data.departureDate)}` },
    { icon: 'cash', text: `${data.budget?.amount || 0} ${data.budget?.currency || 'USD'}` },
    { icon: 'bed', text: data.accommodation?.charAt(0).toUpperCase() + data.accommodation?.slice(1) || 'Any' },
    { icon: 'speedometer', text: `${data.travelPace?.charAt(0).toUpperCase() + data.travelPace?.slice(1) || 'Balanced'} pace` },
    { icon: 'compass', text: data.travelStyle?.join(', ') || 'Not selected' },
    { icon: 'heart', text: data.interests?.join(', ') || 'Not selected' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Review your trip</Text>

      <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
        {items.map((item, index) => (
          <View key={index} style={styles.summaryRow}>
            <Ionicons name={item.icon} size={18} color={colors.primary} />
            <Text style={styles.summaryText} numberOfLines={2}>{item.text}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Special Requirements</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border }]}
        placeholder="e.g., Vegetarian food, avoid crowded places, wheelchair accessible..."
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        value={data.specialRequirements || ''}
        onChangeText={(text) => onChange({ ...data, specialRequirements: text })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heading: {
    ...typography.headingL,
    marginBottom: spacing.xxl,
  },
  summaryCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  summaryText: {
    ...typography.body,
    flex: 1,
  },
  label: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
    marginTop: spacing.xxl,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    ...typography.body,
    minHeight: 100,
  },
});
