import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import StepDestination from '../components/TripForm/StepDestination';
import StepBudget from '../components/TripForm/StepBudget';
import StepStyle from '../components/TripForm/StepStyle';
import StepReview from '../components/TripForm/StepReview';
import LoadingItinerary from '../components/LoadingItinerary';
import { tripsAPI, itineraryAPI } from '../services/api';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { useSettings } from '../context/SettingsContext';

const TOTAL_STEPS = 4;

export default function NewTripScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const { colors } = useSettings();

  const [data, setData] = useState({
    destination: { name: params.destination || '', country: params.country || '' },
    currentLocation: null,
    arrivalDate: null,
    departureDate: null,
    days: parseInt(params.days) || 0,
    budget: { amount: 500, currency: 'USD' },
    accommodation: 'any',
    travelPace: 'balanced',
    travelStyle: [],
    interests: [],
    specialRequirements: '',
  });

  const handleNext = () => {
    if (step === 1 && !data.destination?.name) {
      Alert.alert('Missing info', 'Please enter a destination');
      return;
    }
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else router.back();
  };

  const handleGenerate = async () => {
    if (!data.destination?.name) {
      Alert.alert('Missing info', 'Please enter a destination');
      return;
    }

    setGenerating(true);
    try {
      // Set default dates if not provided
      const tripData = {
        ...data,
        arrivalDate: data.arrivalDate || new Date().toISOString(),
        departureDate: data.departureDate || new Date(Date.now() + (data.days || 3) * 86400000).toISOString(),
        days: data.days || 3,
      };

      const tripRes = await tripsAPI.create(tripData);
      const trip = tripRes.data.trip;

      // Navigate to trip detail - user can generate itinerary there
      router.replace(`/trip/${trip._id}`);
    } catch (error) {
      console.error('Create trip error:', error);
      Alert.alert('Error', 'Failed to create trip. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1: return <StepDestination data={data} onChange={setData} />;
      case 2: return <StepBudget data={data} onChange={setData} />;
      case 3: return <StepStyle data={data} onChange={setData} />;
      case 4: return <StepReview data={data} onChange={setData} />;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.stepLabel, { color: colors.textSecondary }]}>Step {step} of {TOTAL_STEPS}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%`, backgroundColor: colors.primary }]} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, step === TOTAL_STEPS && styles.generateButton, { backgroundColor: colors.primary }]}
          onPress={step === TOTAL_STEPS ? handleGenerate : handleNext}
          activeOpacity={0.8}
        >
          {step === TOTAL_STEPS ? (
            <>
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Generate Itinerary</Text>
            </>
          ) : (
            <>
              <Text style={styles.buttonText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  stepLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  progressBar: {
    height: 3,
    marginHorizontal: spacing.xl,
    borderRadius: 2,
    marginBottom: spacing.lg,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  footer: {
    padding: spacing.xl,
    paddingBottom: spacing.lg,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: borderRadius.md,
    ...shadows.button,
  },
  buttonText: {
    ...typography.button,
  },
});
