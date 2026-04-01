import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSettings } from '../../context/SettingsContext';
import { tripsAPI } from '../../services/api';
import TripCard from '../../components/TripCard';
import { spacing, borderRadius } from '../../styles/theme';

export default function HistoryScreen() {
  const { colors } = useSettings();
  const [trips, setTrips] = useState([]);
  const [filter, setFilter] = useState('upcoming');
  const router = useRouter();

  useEffect(() => { loadTrips(); }, []);

  const loadTrips = async () => {
    try { const res = await tripsAPI.getAll(); setTrips(res.data.trips || []); } catch (e) {}
  };

  const now = new Date();
  const filtered = trips.filter((t) => filter === 'upcoming' ? new Date(t.departureDate) >= now : new Date(t.departureDate) < now);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <Text style={[s.title, { color: colors.textPrimary }]}>My Trips</Text>
      <View style={s.filterRow}>
        {['upcoming', 'past'].map((f) => (
          <TouchableOpacity key={f} style={[s.filterPill, { backgroundColor: colors.card, borderColor: colors.border }, filter === f && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setFilter(f)}>
            <Text style={[s.filterText, { color: colors.textPrimary }, filter === f && { color: '#FFFFFF' }]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {filtered.length > 0 ? (
        <FlatList data={filtered} keyExtractor={(item) => item._id} renderItem={({ item }) => <TripCard trip={item} />} showsVerticalScrollIndicator={false} contentContainerStyle={s.list} />
      ) : (
        <View style={s.empty}>
          <Ionicons name="airplane-outline" size={48} color={colors.textMuted} />
          <Text style={[s.emptyText, { color: colors.textMuted }]}>No {filter} trips</Text>
          <TouchableOpacity style={[s.newTripBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/new-trip')}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={s.newTripBtnText}>New Trip</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl },
  title: { fontSize: 28, fontWeight: '700', marginBottom: spacing.lg },
  filterRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xxl },
  filterPill: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1 },
  filterText: { fontSize: 14, fontWeight: '600' },
  list: { paddingBottom: 100 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: '600', marginTop: spacing.md },
  newTripBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, borderRadius: borderRadius.md, marginTop: spacing.xxl },
  newTripBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
