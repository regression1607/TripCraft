import { View, Text, TextInput, FlatList, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useSettings } from '../../context/SettingsContext';
import { usersAPI } from '../../services/api';
import { chatAPI } from '../../services/chatApi';
import { AvatarCircle } from '../../components/chat/ChatListItem';
import { spacing, borderRadius, shadows } from '../../styles/theme';

export default function NewGroupScreen() {
  const { colors } = useSettings();
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [creating, setCreating] = useState(false);
  const debounceRef = useRef(null);

  const handleSearch = (text) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await usersAPI.search(text);
        setResults(res.data.users || []);
      } catch (e) { setResults([]); }
    }, 500);
  };

  const toggleSelect = (user) => {
    const exists = selected.find(s => s._id === user._id);
    if (exists) {
      setSelected(selected.filter(s => s._id !== user._id));
    } else {
      setSelected([...selected, user]);
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim()) { Alert.alert('Required', 'Please enter a group name'); return; }
    if (selected.length === 0) { Alert.alert('Required', 'Add at least one member'); return; }

    setCreating(true);
    try {
      const res = await chatAPI.createConversation({
        type: 'group',
        name: groupName.trim(),
        participantIds: selected.map(s => s._id),
      });
      router.replace(`/chat/${res.data.conversation._id}`);
    } catch (e) {
      Alert.alert('Error', 'Could not create group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/chat')}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.textPrimary }]}>New Group</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        <Text style={[s.label, { color: colors.textSecondary }]}>Group Name</Text>
        <TextInput
          style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="Enter group name..."
          placeholderTextColor={colors.textMuted}
          value={groupName}
          onChangeText={setGroupName}
        />

        {selected.length > 0 && (
          <>
            <Text style={[s.label, { color: colors.textSecondary }]}>Selected ({selected.length})</Text>
            <View style={s.selectedRow}>
              {selected.map(u => (
                <TouchableOpacity key={u._id} style={[s.chip, { backgroundColor: colors.primaryLight }]} onPress={() => toggleSelect(u)}>
                  <Text style={[s.chipText, { color: colors.primary }]}>{u.name}</Text>
                  <Ionicons name="close" size={14} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={[s.label, { color: colors.textSecondary }]}>Add Members</Text>
        <View style={[s.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[s.searchInput, { color: colors.textPrimary }]}
            placeholder="Search users..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={handleSearch}
          />
        </View>

        {results.map(item => {
          const isSelected = selected.some(s => s._id === item._id);
          return (
            <TouchableOpacity key={item._id} style={[s.userRow, { borderBottomColor: colors.border }]} onPress={() => toggleSelect(item)}>
              <AvatarCircle participant={{ userId: item }} size={40} colors={colors} />
              <View style={s.userInfo}>
                <Text style={[s.userName, { color: colors.textPrimary }]}>{item.name}</Text>
                {item.username && <Text style={[s.userSub, { color: colors.textMuted }]}>@{item.username}</Text>}
              </View>
              <Ionicons name={isSelected ? 'checkmark-circle' : 'add-circle-outline'} size={24} color={isSelected ? colors.success : colors.textMuted} />
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[s.createBtn, { backgroundColor: colors.primary, opacity: creating ? 0.6 : 1 }]}
          onPress={handleCreate}
          disabled={creating}
        >
          <Text style={s.createBtnText}>{creating ? 'Creating...' : 'Create Group'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  title: { fontSize: 20, fontWeight: '700' },
  scrollContent: { padding: spacing.xl, paddingBottom: 100 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: spacing.sm, marginTop: spacing.lg },
  input: { height: 48, borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, fontSize: 16 },
  selectedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  chipText: { fontSize: 13, fontWeight: '600' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, height: 44, borderRadius: borderRadius.md, borderWidth: 1, marginBottom: spacing.md },
  searchInput: { flex: 1, fontSize: 15, height: '100%' },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, gap: spacing.md },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600' },
  userSub: { fontSize: 12 },
  createBtn: { height: 52, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', marginTop: spacing.xxl },
  createBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
