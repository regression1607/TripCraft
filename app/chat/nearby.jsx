import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { chatAPI } from '../../services/chatApi';
import { AvatarCircle } from '../../components/chat/ChatListItem';
import { spacing, borderRadius, shadows } from '../../styles/theme';

export default function NearbyScreen() {
  const { user } = useAuth();
  const { colors } = useSettings();
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const pingIntervalRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      stopNearby();
    };
  }, []);

  const startNearby = async () => {
    setLoading(true);

    // Get location permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Location access is needed to find nearby travelers.');
      setLoading(false);
      return;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      // Ping server with location
      await chatAPI.nearbyPing(loc.coords.latitude, loc.coords.longitude);

      setActive(true);
      setLoading(false);

      // Ping every 30 seconds to keep location fresh
      pingIntervalRef.current = setInterval(async () => {
        try {
          const newLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          await chatAPI.nearbyPing(newLoc.coords.latitude, newLoc.coords.longitude);
        } catch (e) {}
      }, 30000);

      // Poll for nearby users every 5 seconds
      fetchNearbyUsers();
      pollIntervalRef.current = setInterval(fetchNearbyUsers, 5000);
    } catch (e) {
      Alert.alert('Error', 'Could not get your location. Please try again.');
      setLoading(false);
    }
  };

  const stopNearby = async () => {
    setActive(false);
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pingIntervalRef.current = null;
    pollIntervalRef.current = null;
    try { await chatAPI.nearbyStop(); } catch (e) {}
  };

  const fetchNearbyUsers = async () => {
    try {
      const res = await chatAPI.nearbyUsers();
      setUsers(res.data.users || []);
    } catch (e) {}
  };

  const startChatWith = async (otherUser) => {
    try {
      const res = await chatAPI.createConversation({
        type: '1:1',
        participantIds: [otherUser._id],
      });
      router.push(`/chat/${res.data.conversation._id}`);
    } catch (e) {
      Alert.alert('Error', 'Could not start chat');
    }
  };

  const getDistanceLabel = (meters) => {
    if (meters < 50) return 'Very close';
    if (meters < 100) return `~${meters}m away`;
    if (meters < 500) return `~${meters}m away`;
    return 'Nearby';
  };

  const getSignalBars = (meters) => {
    if (meters < 50) return 4;
    if (meters < 100) return 3;
    if (meters < 250) return 2;
    return 1;
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/chat')}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.textPrimary }]}>Nearby Travelers</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* How it works info */}
      {!active && (
        <View style={[s.infoCard, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="location" size={24} color={colors.primary} />
          <View style={s.infoText}>
            <Text style={[s.infoTitle, { color: colors.textPrimary }]}>How it works</Text>
            <Text style={[s.infoDesc, { color: colors.textSecondary }]}>
              Share your location to find TripCraft users within 500m. Even with brief internet, your messages sync instantly.
            </Text>
          </View>
        </View>
      )}

      {/* Start/Stop Button */}
      <TouchableOpacity
        style={[s.mainBtn, { backgroundColor: active ? colors.error : colors.primary }]}
        onPress={active ? stopNearby : startNearby}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name={active ? 'stop-circle' : 'radio'} size={22} color="#FFFFFF" />
            <Text style={s.mainBtnText}>
              {active ? 'Stop Sharing Location' : 'Find Nearby Travelers'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {active && (
        <View style={s.statusRow}>
          <View style={[s.liveDot, { backgroundColor: colors.success }]} />
          <Text style={[s.statusText, { color: colors.success }]}>
            Live - scanning every 5 seconds
          </Text>
        </View>
      )}

      {/* Nearby Users List */}
      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const bars = getSignalBars(item.distance);
          return (
            <View style={[s.userCard, { backgroundColor: colors.card }, shadows.card]}>
              <AvatarCircle participant={{ userId: item }} size={48} colors={colors} />
              <View style={s.userInfo}>
                <Text style={[s.userName, { color: colors.textPrimary }]}>{item.name}</Text>
                {item.username && (
                  <Text style={[s.userUsername, { color: colors.textMuted }]}>@{item.username}</Text>
                )}
                <Text style={[s.userDistance, { color: colors.secondary }]}>
                  {getDistanceLabel(item.distance)}
                </Text>
              </View>
              <View style={s.rightCol}>
                <View style={s.signalBars}>
                  {[1, 2, 3, 4].map(i => (
                    <View key={i} style={[s.bar, { height: 4 + i * 4, backgroundColor: i <= bars ? colors.success : colors.border }]} />
                  ))}
                </View>
                <TouchableOpacity
                  style={[s.chatBtn, { backgroundColor: colors.primary }]}
                  onPress={() => startChatWith(item)}
                >
                  <Ionicons name="chatbubble" size={16} color="#FFFFFF" />
                  <Text style={s.chatBtnText}>Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          active ? (
            <View style={s.empty}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={[s.emptyTitle, { color: colors.textMuted }]}>No one nearby yet</Text>
              <Text style={[s.emptyText, { color: colors.textMuted }]}>
                Other TripCraft users within 500m will appear here.{'\n'}Ask your travel buddies to open this screen too!
              </Text>
            </View>
          ) : null
        }
      />

      {/* Footer info */}
      <View style={[s.footer, { borderTopColor: colors.border }]}>
        <Ionicons name="shield-checkmark" size={14} color={colors.textMuted} />
        <Text style={[s.footerText, { color: colors.textMuted }]}>
          Your exact location is never shared with other users. Only approximate distance is shown.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  title: { fontSize: 20, fontWeight: '700' },
  infoCard: { flexDirection: 'row', marginHorizontal: spacing.xl, padding: spacing.lg, borderRadius: borderRadius.lg, gap: spacing.md, marginBottom: spacing.lg, alignItems: 'flex-start' },
  infoText: { flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  infoDesc: { fontSize: 13, lineHeight: 19 },
  mainBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginHorizontal: spacing.xl, paddingVertical: 15, borderRadius: borderRadius.md, marginBottom: spacing.md },
  mainBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
  userCard: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.md },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600' },
  userUsername: { fontSize: 12, marginTop: 1 },
  userDistance: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  rightCol: { alignItems: 'center', gap: spacing.sm },
  signalBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 4, borderRadius: 2 },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  chatBtnText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  empty: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginTop: spacing.lg },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginTop: spacing.sm },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderTopWidth: 1 },
  footerText: { fontSize: 11, flex: 1 },
});
