import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { tripsAPI } from '../../services/api';
import { chatAPI } from '../../services/chatApi';
import { spacing, borderRadius, shadows } from '../../styles/theme';

export default function DiscoverScreen() {
  const { user } = useAuth();
  const { colors } = useSettings();
  const router = useRouter();
  const [destinations, setDestinations] = useState([]);
  const [selectedDest, setSelectedDest] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDestinations();
  }, []);

  useEffect(() => {
    if (selectedDest) loadGroups(selectedDest);
  }, [selectedDest]);

  const loadDestinations = async () => {
    try {
      const res = await tripsAPI.getAll();
      const trips = res.data.trips || [];
      const unique = [...new Set(trips.map(t => t.destination?.name).filter(Boolean))];
      setDestinations(unique);
      if (unique.length > 0) setSelectedDest(unique[0]);
    } catch (e) {}
  };

  const loadGroups = async (destination) => {
    setLoading(true);
    try {
      const res = await chatAPI.discoverGroups(destination);
      setGroups(res.data.groups || []);
    } catch (e) { setGroups([]); }
    setLoading(false);
  };

  const handleJoin = async (group) => {
    try {
      await chatAPI.joinGroup(group._id);
      router.replace(`/chat/${group._id}`);
    } catch (e) {
      Alert.alert('Error', 'Could not join group');
    }
  };

  const isJoined = (group) => group.participants?.some(p => (p.userId?._id || p.userId)?.toString() === user?.mongoId);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/chat')}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.textPrimary }]}>Discover Groups</Text>
        <View style={{ width: 24 }} />
      </View>

      {destinations.length > 0 && (
        <>
          <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Your Destinations</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={destinations}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.destPill, { backgroundColor: selectedDest === item ? colors.primary : colors.card, borderColor: selectedDest === item ? colors.primary : colors.border }]}
                onPress={() => setSelectedDest(item)}
              >
                <Text style={[s.destPillText, { color: selectedDest === item ? '#FFFFFF' : colors.textPrimary }]}>{item}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={s.destList}
            style={s.destScroll}
          />
        </>
      )}

      <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
        {selectedDest ? `Groups for "${selectedDest}"` : 'Select a destination'}
      </Text>

      <FlatList
        data={groups}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={[s.groupCard, { backgroundColor: colors.card }, shadows.card]}>
            <View style={s.groupHeader}>
              <View style={[s.groupIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="airplane" size={20} color={colors.primary} />
              </View>
              <View style={s.groupInfo}>
                <Text style={[s.groupName, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[s.groupMeta, { color: colors.textSecondary }]}>{item.participantCount || item.participants?.length || 0} members</Text>
              </View>
              {isJoined(item) ? (
                <TouchableOpacity style={[s.joinedBtn, { borderColor: colors.success }]} onPress={() => router.push(`/chat/${item._id}`)}>
                  <Text style={[s.joinedText, { color: colors.success }]}>Open</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[s.joinBtn, { backgroundColor: colors.primary }]} onPress={() => handleJoin(item)}>
                  <Text style={s.joinBtnText}>Join</Text>
                </TouchableOpacity>
              )}
            </View>
            {item.lastMessage?.text && (
              <Text style={[s.lastMsg, { color: colors.textMuted }]} numberOfLines={1}>
                Last: "{item.lastMessage.text}"
              </Text>
            )}
          </View>
        )}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="globe-outline" size={48} color={colors.textMuted} />
            <Text style={[s.emptyText, { color: colors.textMuted }]}>
              {loading ? 'Loading...' : 'No groups for this destination yet'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  title: { fontSize: 20, fontWeight: '700' },
  sectionLabel: { fontSize: 14, fontWeight: '600', paddingHorizontal: spacing.xl, marginTop: spacing.lg, marginBottom: spacing.sm },
  destScroll: { maxHeight: 44, marginBottom: spacing.md },
  destList: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  destPill: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1 },
  destPillText: { fontSize: 14, fontWeight: '600' },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 100 },
  groupCard: { borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  groupIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: '600' },
  groupMeta: { fontSize: 13, marginTop: 2 },
  joinBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  joinBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  joinedBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1 },
  joinedText: { fontSize: 13, fontWeight: '600' },
  lastMsg: { fontSize: 13, marginTop: spacing.sm, fontStyle: 'italic' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, marginTop: spacing.md },
});
