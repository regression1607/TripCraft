import { View, Text, StyleSheet } from 'react-native';
import ChipSelect from '../ChipSelect';
import { typography, spacing } from '../../styles/theme';
import { useSettings } from '../../context/SettingsContext';

const paceOptions = [
  { value: 'fast', label: 'Fast', emoji: '✈️' },
  { value: 'balanced', label: 'Balanced', emoji: '🚆' },
  { value: 'slow', label: 'Slow', emoji: '🚌' },
];

const styleOptions = [
  { value: 'adventure', label: 'Adventure', emoji: '🏔' },
  { value: 'culture', label: 'Culture', emoji: '🎨' },
  { value: 'foodie', label: 'Foodie', emoji: '🍜' },
  { value: 'relaxed', label: 'Relaxed', emoji: '😌' },
];

const interestOptions = [
  { value: 'museum', label: 'Museum', emoji: '🏛' },
  { value: 'nature', label: 'Nature', emoji: '🌿' },
  { value: 'theatre', label: 'Theatre', emoji: '🎭' },
  { value: 'shopping', label: 'Shopping', emoji: '🛍' },
  { value: 'nightlife', label: 'Nightlife', emoji: '🌙' },
  { value: 'photography', label: 'Photography', emoji: '📸' },
  { value: 'beach', label: 'Beach', emoji: '🏖' },
  { value: 'sports', label: 'Sports', emoji: '🏃' },
  { value: 'history', label: 'History', emoji: '📜' },
  { value: 'wellness', label: 'Wellness', emoji: '🧘' },
];

export default function StepStyle({ data, onChange }) {
  const { colors } = useSettings();
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>How do you travel?</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Travel Pace</Text>
      <ChipSelect
        options={paceOptions}
        selected={data.travelPace || 'balanced'}
        onSelect={(travelPace) => onChange({ ...data, travelPace })}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Travel Style</Text>
      <ChipSelect
        options={styleOptions}
        selected={data.travelStyle || []}
        onSelect={(travelStyle) => onChange({ ...data, travelStyle })}
        multiSelect
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Interests (select multiple)</Text>
      <ChipSelect
        options={interestOptions}
        selected={data.interests || []}
        onSelect={(interests) => onChange({ ...data, interests })}
        multiSelect
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
  label: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
    marginTop: spacing.xxl,
  },
});
