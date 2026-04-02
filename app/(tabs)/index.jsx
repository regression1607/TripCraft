import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { authAPI, tripsAPI } from '../../services/api';
import TripCard from '../../components/TripCard';
import { getRandomSuggestions } from '../../utils/destinations';
import { spacing, shadows, borderRadius } from '../../styles/theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const { colors, typography } = useSettings();
  const router = useRouter();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const suggestions = useMemo(() => getRandomSuggestions(10), []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.name?.split(' ')[0] || 'Traveler';

  const initialized = useRef(false);

  useEffect(() => {
    if (user && !initialized.current) {
      initialized.current = true;
      initUser();
    }
  }, [user]);

  const initUser = async () => {
    try {
      await authAPI.verify();
      console.log('[HOME] User verified in backend');
    } catch (e) {
      // Non-critical - user may already exist
    }
    loadTrips();
  };

  const loadTrips = async () => {
    try {
      setLoading(true);
      const res = await tripsAPI.getAll();
      console.log('[HOME] Loaded trips:', res.data.trips?.length || 0);
      setTrips(res.data.trips || []);
    } catch (e) {
      console.log('[HOME] Failed to load trips:', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        <Text style={[s.greeting, { color: colors.textPrimary }]}>{getGreeting()}, {firstName}!</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>Where to next?</Text>

        <Text style={[s.suggestionsLabel, { color: colors.textSecondary }]}>Suggestions for you</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickTrips} contentContainerStyle={s.quickTripsContent}>
          {suggestions.map((dest, idx) => (
            <TouchableOpacity
              key={`${dest.name}-${idx}`}
              style={[s.quickTripChip, { backgroundColor: colors.primaryLight }]}
              onPress={() => router.push({ pathname: '/new-trip', params: { destination: dest.name, country: dest.country } })}
            >
              <Text style={s.quickTripEmoji}>{dest.emoji}</Text>
              <Text style={[s.quickTripName, { color: colors.primary }]}>{dest.name}</Text>
              <Text style={[s.quickTripDays, { color: colors.primary }]}>{dest.country}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={[s.ctaCard, { backgroundColor: colors.primary }]} activeOpacity={0.8} onPress={() => router.push('/new-trip')}>
          <Ionicons name="airplane" size={28} color="#FFFFFF" />
          <View style={s.ctaText}>
            <Text style={s.ctaTitle}>Plan a New Trip</Text>
            <Text style={s.ctaSubtitle}>Enter your details and let AI plan it</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Recent Trips</Text>
          {trips.length > 0 ? (
            trips.slice(0, 5).map((trip) => <TripCard key={trip._id} trip={trip} />)
          ) : (
            <View style={s.emptyState}>
              <Ionicons name="compass-outline" size={48} color={colors.textMuted} />
              <Text style={[s.emptyText, { color: colors.textMuted }]}>No trips yet</Text>
              <Text style={[s.emptySubtext, { color: colors.textMuted }]}>Plan your first adventure!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: 100 },
  greeting: { fontSize: 22, fontWeight: '700', marginBottom: spacing.xs },
  subtitle: { fontSize: 16, marginBottom: spacing.xxl },
  suggestionsLabel: { fontSize: 14, fontWeight: '600', marginBottom: spacing.sm },
  quickTrips: { marginBottom: spacing.xxl, marginHorizontal: -spacing.xl },
  quickTripsContent: { paddingHorizontal: spacing.xl, gap: spacing.md },
  quickTripChip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center', minWidth: 80 },
  quickTripEmoji: { fontSize: 24, marginBottom: spacing.xs },
  quickTripName: { fontSize: 14, fontWeight: '600' },
  quickTripDays: { fontSize: 12 },
  ctaCard: { borderRadius: borderRadius.lg, padding: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xxxl, ...shadows.button },
  ctaText: { flex: 1 },
  ctaTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: spacing.xs },
  ctaSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  section: { marginBottom: spacing.xxl },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: spacing.lg },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxxl },
  emptyText: { fontSize: 18, fontWeight: '600', marginTop: spacing.md },
  emptySubtext: { fontSize: 14, marginTop: spacing.xs },
});
