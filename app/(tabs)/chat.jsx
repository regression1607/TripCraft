import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { chatAPI } from '../../services/chatApi';
import { initBLE, startScanning, stopScanning, isAvailable } from '../../services/bleChat';
import { getCachedConversations, cacheConversations } from '../../services/offlineChat';
import usePolling from '../../hooks/usePolling';
import useNetworkStatus from '../../hooks/useNetworkStatus';
import ChatListItem from '../../components/chat/ChatListItem';
import OfflineIndicator from '../../components/chat/OfflineIndicator';
import { spacing, borderRadius } from '../../styles/theme';

export default function ChatScreen() {
  const { user } = useAuth();
  const { colors, chatMode, toggleChatMode } = useSettings();
  const router = useRouter();
  const isFocused = useIsFocused();
  const isOnline = useNetworkStatus();
  const [search, setSearch] = useState('');

  const [offlineConversations, setOfflineConversations] = useState([]);

  // Start BLE scanning when offline mode is active
  useEffect(() => {
    if (chatMode === 'offline') {
      initBLE(user);
      if (isAvailable()) startScanning();
      loadOfflineConversations();
    } else {
      stopScanning();
    }
    return () => stopScanning();
  }, [chatMode]);

  const loadOfflineConversations = async () => {
    const cached = await getCachedConversations();
    setOfflineConversations(cached);
  };

  const fetchConversations = useCallback(async () => {
    const res = await chatAPI.getConversations();
    const convs = res.data.conversations || [];
    // Cache for offline use
    if (convs.length > 0) cacheConversations(convs).catch(() => {});
    return convs;
  }, []);

  const { data: conversations, loading, refresh } = usePolling(
    fetchConversations,
    3000,
    isFocused && chatMode === 'online'
  );

  const displayConversations = chatMode === 'offline' ? offlineConversations : conversations;

  const filtered = (displayConversations || []).filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) ||
      c.participants?.some(p => (p.userId?.name || '').toLowerCase().includes(q));
  });

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: colors.textPrimary }]}>Chats</Text>
        <View style={s.headerRight}>
          <TouchableOpacity onPress={() => router.push('/chat/nearby')}>
            <Ionicons name="radio" size={22} color={colors.secondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleChatMode}>
            <Ionicons
              name={chatMode === 'online' ? 'cloud' : 'cloud-offline'}
              size={22}
              color={chatMode === 'online' ? '#10B981' : colors.warning}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/chat/new')}>
            <Ionicons name="create-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {(chatMode === 'offline' || !isOnline) && <OfflineIndicator />}

      <View style={[s.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[s.searchInput, { color: colors.textPrimary }]}
          placeholder="Search chats..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <TouchableOpacity
        style={[s.discoverBtn, { backgroundColor: colors.primaryLight }]}
        onPress={() => router.push('/chat/discover')}
      >
        <Ionicons name="compass" size={18} color={colors.primary} />
        <Text style={[s.discoverText, { color: colors.primary }]}>Discover Trip Groups</Text>
      </TouchableOpacity>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <ChatListItem
            conversation={item}
            currentUserId={user?.mongoId}
            onPress={() => router.push(`/chat/${item._id}`)}
          />
        )}
        refreshing={loading}
        onRefresh={refresh}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
            <Text style={[s.emptyTitle, { color: colors.textMuted }]}>No conversations yet</Text>
            <Text style={[s.emptySubtext, { color: colors.textMuted }]}>Start chatting with fellow travelers!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  title: { fontSize: 28, fontWeight: '700' },
  headerRight: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.xl, paddingHorizontal: spacing.md, height: 44, borderRadius: borderRadius.md, borderWidth: 1, marginBottom: spacing.md },
  searchInput: { flex: 1, fontSize: 15, height: '100%' },
  discoverBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: borderRadius.full, marginBottom: spacing.md },
  discoverText: { fontSize: 14, fontWeight: '600' },
  list: { paddingBottom: 100 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: spacing.lg },
  emptySubtext: { fontSize: 14, marginTop: spacing.xs },
});
