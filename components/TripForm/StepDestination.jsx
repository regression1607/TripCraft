import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo } from 'react';
import * as Location from 'expo-location';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { getRandomSuggestions } from '../../utils/destinations';
import { typography, spacing, borderRadius } from '../../styles/theme';
import { useSettings } from '../../context/SettingsContext';

function DateInput({ label, value, onChange, minimumDate }) {
  const { colors } = useSettings();
  const [showIOSPicker, setShowIOSPicker] = useState(false);
  const currentDate = value ? new Date(value) : new Date();

  const formatDateTime = (date) => {
    if (!date) return 'Select date & time';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePress = () => {
    if (Platform.OS === 'android') {
      // Android: use imperative API - show date picker first, then time picker
      DateTimePickerAndroid.open({
        value: currentDate,
        mode: 'date',
        minimumDate: minimumDate,
        onChange: (event, selectedDate) => {
          if (event.type === 'dismissed' || !selectedDate) return;
          // Now show time picker
          DateTimePickerAndroid.open({
            value: selectedDate,
            mode: 'time',
            is24Hour: true,
            onChange: (timeEvent, selectedTime) => {
              if (timeEvent.type === 'dismissed' || !selectedTime) return;
              onChange(selectedTime.toISOString());
            },
          });
        },
      });
    } else {
      // iOS: show inline picker
      setShowIOSPicker(!showIOSPicker);
    }
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handlePress}>
        <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
        <Text style={[styles.dateText, { color: colors.textMuted }, value && { color: colors.textPrimary }]}>
          {formatDateTime(value)}
        </Text>
      </TouchableOpacity>
      {Platform.OS === 'ios' && showIOSPicker && (
        <DateTimePicker
          value={currentDate}
          mode="datetime"
          display="spinner"
          minimumDate={minimumDate}
          onChange={(e, date) => {
            if (date) onChange(date.toISOString());
          }}
          style={{ height: 200 }}
        />
      )}
    </View>
  );
}

export default function StepDestination({ data, onChange }) {
  const { colors } = useSettings();
  const [locatingFrom, setLocatingFrom] = useState(false);
  const popularDestinations = useMemo(() => getRandomSuggestions(8), []);

  const selectPopular = (dest) => {
    onChange({
      ...data,
      destination: { name: dest.name, country: dest.country },
    });
  };

  const detectCurrentLocation = async () => {
    setLocatingFrom(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocatingFrom(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (place) {
        const cityName = place.city || place.subregion || place.region || 'Unknown';
        onChange({
          ...data,
          currentLocation: {
            name: cityName,
            region: place.region || '',
            country: place.country || '',
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          },
        });
      }
    } catch (e) {
      console.log('Location error:', e.message);
    } finally {
      setLocatingFrom(false);
    }
  };

  const calcDays = (arrival, departure) => {
    if (!arrival || !departure) return 0;
    const diff = new Date(departure) - new Date(arrival);
    return Math.max(1, Math.ceil(diff / 86400000));
  };

  const handleArrivalChange = (iso) => {
    const days = calcDays(iso, data.departureDate);
    onChange({ ...data, arrivalDate: iso, days: days || data.days });
  };

  const handleDepartureChange = (iso) => {
    const days = calcDays(data.arrivalDate, iso);
    onChange({ ...data, departureDate: iso, days: days || data.days });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Where are you going?</Text>

      {/* Current Location */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Departing From</Text>
      <TouchableOpacity
        style={[styles.locationButton, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
        onPress={detectCurrentLocation}
        disabled={locatingFrom}
      >
        {locatingFrom ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="navigate" size={18} color={colors.primary} />
        )}
        <Text style={[styles.locationText, data.currentLocation && { color: colors.textPrimary, fontWeight: '600' }]}>
          {data.currentLocation
            ? `${data.currentLocation.name}${data.currentLocation.region ? ', ' + data.currentLocation.region : ''}`
            : 'Tap to detect your current location'}
        </Text>
        {data.currentLocation && (
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        )}
      </TouchableOpacity>

      {/* Destination */}
      <Text style={[styles.label, { marginTop: spacing.xl, color: colors.textSecondary }]}>Destination</Text>
      <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.input}
          placeholder="Search destination"
          placeholderTextColor={colors.textMuted}
          value={data.destination?.name || ''}
          onChangeText={(text) =>
            onChange({ ...data, destination: { ...data.destination, name: text } })
          }
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Popular Destinations</Text>
      <View style={styles.popularRow}>
        {popularDestinations.map((dest) => (
          <TouchableOpacity
            key={dest.name}
            style={[
              styles.popularChip,
              { backgroundColor: colors.card, borderColor: colors.border },
              data.destination?.name === dest.name && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
            ]}
            onPress={() => selectPopular(dest)}
          >
            <Text style={styles.popularEmoji}>{dest.emoji}</Text>
            <Text
              style={[
                styles.popularText,
                data.destination?.name === dest.name && { color: colors.primary },
              ]}
            >
              {dest.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <DateInput
        label="Arrival"
        value={data.arrivalDate}
        onChange={handleArrivalChange}
      />

      <DateInput
        label="Departure"
        value={data.departureDate}
        onChange={handleDepartureChange}
        minimumDate={data.arrivalDate ? new Date(data.arrivalDate) : new Date()}
      />

      <Text style={[styles.label, { marginTop: spacing.xl, color: colors.textSecondary }]}>
        Number of Days: {data.days || 0}
      </Text>
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
    marginBottom: spacing.xxl,
  },
  input: {
    flex: 1,
    ...typography.body,
    height: '100%',
  },
  label: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  popularRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  popularChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  popularEmoji: {
    fontSize: 14,
  },
  popularText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  locationText: {
    ...typography.bodySmall,
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  dateText: {
    ...typography.body,
  },
});
