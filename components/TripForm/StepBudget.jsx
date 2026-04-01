import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import ChipSelect from '../ChipSelect';
import { typography, spacing, borderRadius, shadows } from '../../styles/theme';
import { useSettings } from '../../context/SettingsContext';

const currencies = [
  { value: 'USD', label: 'USD', emoji: '$' },
  { value: 'EUR', label: 'EUR', emoji: '€' },
  { value: 'GBP', label: 'GBP', emoji: '£' },
  { value: 'INR', label: 'INR', emoji: '₹' },
  { value: 'JPY', label: 'JPY', emoji: '¥' },
];

const accommodations = [
  { value: 'hotel', label: 'Hotel', icon: 'bed-outline' },
  { value: 'hostel', label: 'Hostel', icon: 'people-outline' },
  { value: 'airbnb', label: 'Airbnb', icon: 'home-outline' },
  { value: 'any', label: 'Any', icon: 'help-outline' },
];

export default function StepBudget({ data, onChange }) {
  const { colors } = useSettings();
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Set your budget</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Currency</Text>
      <ChipSelect
        options={currencies}
        selected={data.budget?.currency || 'USD'}
        onSelect={(currency) =>
          onChange({ ...data, budget: { ...data.budget, currency } })
        }
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Total Budget</Text>
      <View style={[styles.budgetInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>
          {currencies.find((c) => c.value === data.budget?.currency)?.emoji || '$'}
        </Text>
        <TextInput
          style={[styles.budgetValue, { color: colors.textPrimary }]}
          keyboardType="numeric"
          value={String(data.budget?.amount || '')}
          onChangeText={(text) => {
            const amount = parseInt(text) || 0;
            onChange({ ...data, budget: { ...data.budget, amount } });
          }}
          placeholder="500"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <Slider
        style={styles.slider}
        minimumValue={100}
        maximumValue={5000}
        step={50}
        value={data.budget?.amount || 500}
        onValueChange={(amount) =>
          onChange({ ...data, budget: { ...data.budget, amount: Math.round(amount) } })
        }
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
      />
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>$100</Text>
        <Text style={styles.sliderLabel}>$5,000</Text>
      </View>

      <Text style={[styles.label, { marginTop: spacing.xxl, color: colors.textSecondary }]}>Accommodation</Text>
      <View style={styles.accommGrid}>
        {accommodations.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[
              styles.accommCard,
              { backgroundColor: colors.card, borderColor: colors.border },
              data.accommodation === item.value && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
            ]}
            onPress={() => onChange({ ...data, accommodation: item.value })}
          >
            <Ionicons
              name={item.icon}
              size={28}
              color={data.accommodation === item.value ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.accommLabel,
                data.accommodation === item.value && { color: colors.primary },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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
    marginTop: spacing.lg,
  },
  budgetInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    marginRight: spacing.md,
  },
  budgetValue: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
  },
  slider: {
    marginTop: spacing.lg,
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    ...typography.caption,
  },
  accommGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  accommCard: {
    flex: 1,
    minWidth: 120,
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.card,
  },
  accommLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
});
