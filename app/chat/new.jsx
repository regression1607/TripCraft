import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { usersAPI } from '../../services/api';
import { chatAPI } from '../../services/chatApi';
import { AvatarCircle } from '../../components/chat/ChatListItem';
import { spacing, borderRadius } from '../../styles/theme';

export default function NewChatScreen() {
  const { user } = useAuth();
  const { colors } = useSettings();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const res = await usersAPI.getFriends();
      const accepted = (res.data.friends || []).filter(f => f.status === 'accepted');
      setFriends(accepted);
    } catch (e) {
      // silent
    }
  };

  const handleSearch = (text) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await usersAPI.search(text);
        setResults(res.data.users || []);
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  const startChat = async (otherUser) => {
    try {
      const res = await chatAPI.createConversation({
        type: '1:1',
        participantIds: [otherUser._id],
      });
      router.replace(`/chat/${res.data.conversation._id}`);
    } catch (e) {
      Alert.alert('Error', 'Could not start chat');
    }
  };

  const addFriend = async (otherUser) => {
    try {
      await usersAPI.addFriend(otherUser._id);
      Alert.alert('Sent', `Friend request sent to ${otherUser.name}`);
    } catch (e) {
      Alert.alert('Error', 'Could not send friend request');
    }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/chat')}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.textPrimary }]}>New Chat</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[s.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[s.searchInput, { color: colors.textPrimary }]}
          placeholder="Search by name, email, or username..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={handleSearch}
          autoFocus
        />
      </View>

      <TouchableOpacity
        style={[s.createGroupBtn, { backgroundColor: colors.primaryLight }]}
        onPress={() => router.push('/chat/new-group')}
      >
        <Ionicons name="people" size={20} color={colors.primary} />
        <Text style={[s.createGroupText, { color: colors.primary }]}>Create Group</Text>
      </TouchableOpacity>

      <FlatList
        data={results}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={[s.userRow, { borderBottomColor: colors.border }]}>
            <AvatarCircle participant={{ userId: item }} size={44} colors={colors} />
            <View style={s.userInfo}>
              <Text style={[s.userName, { color: colors.textPrimary }]}>{item.name}</Text>
              {item.username && <Text style={[s.userUsername, { color: colors.textMuted }]}>@{item.username}</Text>}
            </View>
            <TouchableOpacity
              style={[s.chatBtn, { backgroundColor: colors.primary }]}
              onPress={() => startChat(item)}
            >
              <Text style={s.chatBtnText}>Chat</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          search.length >= 2 && !loading ? (
            <View style={s.empty}>
              <Text style={[s.emptyText, { color: colors.textMuted }]}>No users found</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  title: { fontSize: 20, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.xl, paddingHorizontal: spacing.md, height: 48, borderRadius: borderRadius.md, borderWidth: 1, marginBottom: spacing.md },
  searchInput: { flex: 1, fontSize: 15, height: '100%' },
  createGroupBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.lg },
  createGroupText: { fontSize: 15, fontWeight: '600' },
  list: { paddingBottom: 100 },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, gap: spacing.md },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600' },
  userUsername: { fontSize: 12, marginTop: 1 },
  chatBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  chatBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl },
  emptyText: { fontSize: 15 },
});
