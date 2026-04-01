import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { tripsAPI, itineraryAPI, weatherAPI } from '../../services/api';
import useUndoRedo from '../../hooks/useUndoRedo';
import ItineraryTimeline from '../../components/ItineraryTimeline';
import MapView from '../../components/MapView';
import BudgetTracker from '../../components/BudgetTracker';
import WeatherWidget from '../../components/WeatherWidget';
import PackingList from '../../components/PackingList';
import LoadingItinerary from '../../components/LoadingItinerary';
import EditActivityModal from '../../components/EditActivityModal';
import UndoSnackbar from '../../components/UndoSnackbar';
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme';
import { useSettings } from '../../context/SettingsContext';

const TABS = [
  { key: 'plan', label: 'Plan', icon: 'list' },
  { key: 'map', label: 'Map', icon: 'map' },
  { key: 'budget', label: 'Budget', icon: 'cash' },
  { key: 'pack', label: 'Pack', icon: 'bag' },
];

export default function TripDetailScreen() {
  const { colors } = useSettings();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const [trip, setTrip] = useState(null);
  const [activeTab, setActiveTab] = useState('plan');
  const [weather, setWeather] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState({ visible: false, activity: null, dayNum: 0, actIdx: 0, isNew: false });
  const [showSnackbar, setShowSnackbar] = useState(false);

  const {
    state: itinerary,
    applyEdit,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    lastAction,
  } = useUndoRedo(null);

  const saveTimerRef = useRef(null);

  useEffect(() => {
    loadTrip();
  }, [id]);

  useEffect(() => {
    if (lastAction) {
      setShowSnackbar(true);
      autoSave();
    }
  }, [lastAction, autoSave]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const loadTrip = async () => {
    try {
      setLoading(true);
      console.log('[TRIP] Loading trip:', id);
      const res = await tripsAPI.getById(id);
      setTrip(res.data.trip);
      reset(res.data.itinerary || null);
      console.log('[TRIP] Trip loaded, has itinerary:', !!res.data.itinerary);
      if (res.data.trip?.destination?.name) {
        loadWeather(res.data.trip.destination.name);
      }
    } catch (e) {
      console.log('[TRIP] Failed to load trip:', e.message);
      Alert.alert('Error', 'Failed to load trip');
    } finally {
      setLoading(false);
    }
  };

  const loadWeather = async (city) => {
    try {
      const res = await weatherAPI.getByCity(city);
      setWeather(res.data.forecasts || []);
    } catch (e) {
      // silent
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      console.log('[TRIP] Generating itinerary for trip:', id);
      const res = await itineraryAPI.generate(id);
      console.log('[TRIP] Itinerary generated successfully');
      reset(res.data.itinerary);
      setTrip((prev) => ({ ...prev, status: 'ready' }));
    } catch (e) {
      console.error('[TRIP] Generate failed:', e.message);
      Alert.alert('Generation Failed', 'Could not generate itinerary. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = () => {
    Alert.alert(
      'Regenerate Itinerary',
      'This will replace your current itinerary with a new one. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Regenerate', onPress: handleGenerate },
      ]
    );
  };

  const autoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (itinerary?._id) {
        try {
          await itineraryAPI.update(itinerary._id, {
            days: itinerary.days,
            packingList: itinerary.packingList,
          });
          console.log('[TRIP] Auto-saved itinerary');
        } catch (e) {
          console.log('[TRIP] Auto-save failed:', e.message);
        }
      }
    }, 2000);
  }, [itinerary]);

  const handleEditActivity = (dayNum, actIdx, activity) => {
    setEditModal({ visible: true, activity, dayNum, actIdx, isNew: false });
  };

  const handleSaveActivity = (updatedActivity) => {
    if (!itinerary) return;
    const newDays = JSON.parse(JSON.stringify(itinerary.days));
    const dayIdx = newDays.findIndex((d) => d.dayNumber === editModal.dayNum);
    if (dayIdx === -1) return;

    newDays[dayIdx].activities[editModal.actIdx] = updatedActivity;
    applyEdit({ ...itinerary, days: newDays }, `Edited "${updatedActivity.title}"`);
    setEditModal({ visible: false, activity: null, dayNum: 0, actIdx: 0, isNew: false });
  };

  const handleDeleteActivity = (activity) => {
    if (!itinerary) return;
    const newDays = JSON.parse(JSON.stringify(itinerary.days));
    const dayIdx = newDays.findIndex((d) => d.dayNumber === editModal.dayNum);
    if (dayIdx === -1) return;

    newDays[dayIdx].activities.splice(editModal.actIdx, 1);
    applyEdit({ ...itinerary, days: newDays }, `Deleted "${activity.title}"`);
    setEditModal({ visible: false, activity: null, dayNum: 0, actIdx: 0, isNew: false });
  };

  const handleAddActivity = (dayNum, insertIdx) => {
    setEditModal({
      visible: true,
      activity: { title: '', time: '', duration: '', type: 'attraction', cost: 0, location: { name: '' } },
      dayNum,
      actIdx: insertIdx,
      isNew: true,
    });
  };

  const handleSaveNewActivity = (newActivity) => {
    if (!itinerary) return;
    const newDays = JSON.parse(JSON.stringify(itinerary.days));
    const dayIdx = newDays.findIndex((d) => d.dayNumber === editModal.dayNum);
    if (dayIdx === -1) return;

    if (!newDays[dayIdx].activities) newDays[dayIdx].activities = [];
    newDays[dayIdx].activities.splice(editModal.actIdx, 0, newActivity);
    applyEdit({ ...itinerary, days: newDays }, `Added "${newActivity.title}"`);
    setEditModal({ visible: false, activity: null, dayNum: 0, actIdx: 0, isNew: false });
  };

  const handleTogglePackItem = (catIdx, itemIdx) => {
    if (!itinerary?.packingList) return;
    const newPacking = JSON.parse(JSON.stringify(itinerary.packingList));
    newPacking[catIdx].items[itemIdx].packed = !newPacking[catIdx].items[itemIdx].packed;
    applyEdit({ ...itinerary, packingList: newPacking }, 'Updated packing list');
  };

  const handleAddPackItem = (catIdx, itemName) => {
    if (!itinerary?.packingList) return;
    const newPacking = JSON.parse(JSON.stringify(itinerary.packingList));
    newPacking[catIdx].items.push({ name: itemName, packed: false });
    applyEdit({ ...itinerary, packingList: newPacking }, `Added "${itemName}"`);
  };

  const handleDeletePackItem = (catIdx, itemIdx) => {
    if (!itinerary?.packingList) return;
    const newPacking = JSON.parse(JSON.stringify(itinerary.packingList));
    const itemName = newPacking[catIdx].items[itemIdx]?.name;
    newPacking[catIdx].items.splice(itemIdx, 1);
    applyEdit({ ...itinerary, packingList: newPacking }, `Removed "${itemName}"`);
  };

  const handleUndo = () => {
    undo();
    setShowSnackbar(false);
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Show loading animation while generating
  if (generating) {
    return <LoadingItinerary destination={trip?.destination?.name} />;
  }

  // Show loading spinner while fetching trip data
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.dateRange, { color: colors.textSecondary, marginTop: spacing.md }]}>Loading trip...</Text>
      </SafeAreaView>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'plan':
        return (
          <ItineraryTimeline
            days={itinerary?.days || []}
            onEditActivity={handleEditActivity}
            onAddActivity={handleAddActivity}
          />
        );
      case 'map':
        return <MapView days={itinerary?.days || []} style={{ height: screenHeight * 0.6 }} />;
      case 'budget':
        return (
          <BudgetTracker
            budget={trip?.budget}
            breakdown={itinerary?.budgetBreakdown}
            days={itinerary?.days}
          />
        );
      case 'pack':
        return (
          <PackingList
            packingList={itinerary?.packingList || []}
            onToggleItem={handleTogglePackItem}
            onAddItem={handleAddPackItem}
            onDeleteItem={handleDeletePackItem}
          />
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleUndo} disabled={!canUndo}>
            <Ionicons name="arrow-undo" size={22} color={canUndo ? colors.textPrimary : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={redo} disabled={!canRedo}>
            <Ionicons name="arrow-redo" size={22} color={canRedo ? colors.textPrimary : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={itinerary ? handleRegenerate : handleGenerate}>
            <Ionicons name="sync" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.destination, { color: colors.textPrimary }]}>
          {trip?.destination?.name}{trip?.destination?.country ? `, ${trip.destination.country}` : ''}
        </Text>
        <Text style={[styles.dateRange, { color: colors.textSecondary }]}>
          {formatDate(trip?.arrivalDate)} - {formatDate(trip?.departureDate)} · {trip?.days} days
        </Text>

        <WeatherWidget forecasts={weather} />

        {/* No itinerary yet - show generate button */}
        {!itinerary ? (
          <View style={styles.noItinerary}>
            <Ionicons name="sparkles-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.noItineraryTitle, { color: colors.textPrimary }]}>No Itinerary Yet</Text>
            <Text style={[styles.noItineraryText, { color: colors.textSecondary }]}>
              Generate an AI-powered itinerary for your trip
            </Text>
            <TouchableOpacity style={[styles.generateBtn, { backgroundColor: colors.primary }]} onPress={handleGenerate}>
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              <Text style={styles.generateBtnText}>Generate Itinerary</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabs}
              contentContainerStyle={styles.tabsContent}
            >
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tab,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    activeTab === tab.key && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                  ]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Ionicons
                    name={tab.icon}
                    size={18}
                    color={activeTab === tab.key ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === tab.key && { color: colors.primary }]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.tabContent}>
              {renderTab()}
            </View>
          </>
        )}
      </ScrollView>

      <EditActivityModal
        visible={editModal.visible}
        activity={editModal.activity}
        onSave={editModal.isNew ? handleSaveNewActivity : handleSaveActivity}
        onDelete={handleDeleteActivity}
        onClose={() => setEditModal({ visible: false, activity: null, dayNum: 0, actIdx: 0, isNew: false })}
      />

      {showSnackbar && lastAction && (
        <UndoSnackbar
          message={lastAction}
          onUndo={handleUndo}
          onDismiss={() => setShowSnackbar(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  headerActions: { flexDirection: 'row', gap: spacing.lg },
  scrollContent: { padding: spacing.xl, paddingTop: 0 },
  destination: { ...typography.headingXL, marginBottom: spacing.xs },
  dateRange: { ...typography.bodySmall, marginBottom: spacing.lg },
  noItinerary: { alignItems: 'center', paddingVertical: 60 },
  noItineraryTitle: { ...typography.headingM, marginTop: spacing.lg },
  noItineraryText: { ...typography.bodySmall, marginTop: spacing.sm, textAlign: 'center' },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg, borderRadius: borderRadius.md, marginTop: spacing.xxl, ...shadows.button },
  generateBtnText: { ...typography.button },
  tabs: { marginTop: spacing.lg, marginBottom: spacing.xxl, marginHorizontal: -spacing.xl },
  tabsContent: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  tab: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1 },
  tabText: { ...typography.bodySmall, fontWeight: '600' },
  tabContent: { minHeight: 300 },
});
