import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettings } from '../context/SettingsContext';
import { spacing, shadows, borderRadius } from '../styles/theme';

export default function TripCard({ trip }) {
  const { colors } = useSettings();
  const router = useRouter();
  const formatDate = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <TouchableOpacity style={[s.card, { backgroundColor: colors.card }, shadows.card]} activeOpacity={0.7} onPress={() => router.push(`/trip/${trip._id}`)}>
      <View style={s.header}>
        <Ionicons name="location" size={18} color={colors.primary} />
        <Text style={[s.dest, { color: colors.textPrimary }]} numberOfLines={1}>{trip.destination?.name || 'Unknown'}</Text>
      </View>
      <Text style={[s.details, { color: colors.textSecondary }]}>
        {trip.days} days · ${trip.budget?.amount} · {formatDate(trip.arrivalDate)} - {formatDate(trip.departureDate)}
      </Text>
      {trip.travelStyle?.length > 0 && (
        <View style={s.tags}>
          {trip.travelStyle.slice(0, 3).map((st) => (
            <View key={st} style={[s.tag, { backgroundColor: colors.primaryLight }]}>
              <Text style={[s.tagText, { color: colors.primary }]}>{st}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  dest: { fontSize: 18, fontWeight: '600', flex: 1 },
  details: { fontSize: 14, marginBottom: spacing.sm },
  tags: { flexDirection: 'row', gap: spacing.sm },
  tag: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  tagText: { fontSize: 12, fontWeight: '600' },
});
