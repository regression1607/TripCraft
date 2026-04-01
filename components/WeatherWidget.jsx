import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, borderRadius, shadows } from '../styles/theme';
import { useSettings } from '../context/SettingsContext';

const weatherIcons = {
  Clear: 'sunny',
  Clouds: 'cloud',
  Rain: 'rainy',
  Drizzle: 'rainy',
  Thunderstorm: 'thunderstorm',
  Snow: 'snow',
  Mist: 'cloudy',
  Fog: 'cloudy',
};

export default function WeatherWidget({ forecasts }) {
  const { colors } = useSettings();
  if (!forecasts || forecasts.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="cloud-offline-outline" size={24} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Weather data unavailable</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {forecasts.map((day, index) => {
        const iconName = weatherIcons[day.condition] || 'partly-sunny';
        const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });

        return (
          <View key={index} style={[styles.dayCard, { backgroundColor: colors.card }]}>
            <Text style={styles.dayName}>{dayName}</Text>
            <Ionicons name={iconName} size={28} color={colors.primary} />
            <Text style={styles.temp}>{day.temp}°</Text>
            <Text style={styles.condition}>{day.condition}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  dayCard: {
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    minWidth: 70,
    ...shadows.card,
  },
  dayName: {
    ...typography.caption,
    fontWeight: '700',
  },
  temp: {
    ...typography.headingM,
    fontSize: 16,
  },
  condition: {
    ...typography.caption,
    fontSize: 10,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  emptyText: {
    ...typography.bodySmall,
  },
});
