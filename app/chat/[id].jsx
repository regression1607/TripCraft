import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActionSheetIOS, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { chatAPI } from '../../services/chatApi';
import { sendOfflineMessage, onMessageReceived } from '../../services/bleChat';
import { saveOfflineMessage, getOfflineMessages, syncPendingMessages } from '../../services/offlineChat';
import usePolling from '../../hooks/usePolling';
import MessageBubble from '../../components/chat/MessageBubble';
import MessageInput from '../../components/chat/MessageInput';
import OfflineIndicator from '../../components/chat/OfflineIndicator';
import { spacing } from '../../styles/theme';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { colors, chatMode } = useSettings();
  const router = useRouter();
  const isFocused = useIsFocused();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastTimestampRef = useRef(null);
  const flatListRef = useRef(null);

  // Load conversation details
  useEffect(() => {
    loadConversation();
    if (chatMode === 'offline') {
      loadOfflineMessages();
    } else {
      loadMessages();
    }
  }, [id, chatMode]);

  // Listen for BLE incoming messages
  useEffect(() => {
    const unsubscribe = onMessageReceived((msg) => {
      if (msg.conversationId === id) {
        setMessages(prev => [...prev, {
          _id: msg.id,
          senderId: msg.senderId,
          senderName: msg.senderName,
          text: msg.text,
          type: msg.type,
          createdAt: new Date(msg.createdAt).toISOString(),
          isOffline: true,
        }]);
      }
    });
    return unsubscribe;
  }, [id]);

  // Auto-sync when switching from offline to online
  useEffect(() => {
    if (chatMode === 'online') {
      syncPendingMessages().then((count) => {
        if (count > 0) {
          console.log(`[CHAT] Synced ${count} offline messages`);
          loadMessages(); // Reload from server
        }
      }).catch(() => {});
    }
  }, [chatMode]);

  const loadOfflineMessages = async () => {
    try {
      const msgs = await getOfflineMessages(id);
      setMessages(msgs);
    } catch (e) {}
  };

  // Mark as read when opening
  useEffect(() => {
    if (id && isFocused) {
      chatAPI.markRead(id).catch(() => {});
    }
  }, [id, isFocused]);

  const loadConversation = async () => {
    try {
      const res = await chatAPI.getConversation(id);
      setConversation(res.data.conversation);
    } catch (e) {}
  };

  const loadMessages = async () => {
    try {
      const res = await chatAPI.getMessages(id, { limit: 25 });
      setMessages(res.data.messages || []);
      setHasMore(res.data.hasMore);
      if (res.data.messages?.length > 0) {
        lastTimestampRef.current = res.data.messages[res.data.messages.length - 1].createdAt;
      }
    } catch (e) {}
  };

  // Poll for new messages
  const fetchNewMessages = useCallback(async () => {
    if (!lastTimestampRef.current) return;
    const res = await chatAPI.getMessages(id, { after: lastTimestampRef.current });
    const newMsgs = res.data.messages || [];
    if (newMsgs.length > 0) {
      setMessages(prev => [...prev, ...newMsgs]);
      lastTimestampRef.current = newMsgs[newMsgs.length - 1].createdAt;
      chatAPI.markRead(id).catch(() => {});
    }
  }, [id]);

  usePolling(fetchNewMessages, 2000, isFocused && chatMode === 'online' && !!lastTimestampRef.current);

  const loadOlder = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = messages[0]?.createdAt;
      const res = await chatAPI.getMessages(id, { before: oldest, limit: 25 });
      const older = res.data.messages || [];
      setMessages(prev => [...older, ...prev]);
      setHasMore(res.data.hasMore);
    } catch (e) {}
    setLoadingMore(false);
  };

  const handleSend = async (text) => {
    if (chatMode === 'offline') {
      // Offline: save locally + send via BLE
      const offlineMsg = {
        _id: `offline-${Date.now()}`,
        conversationId: id,
        senderId: user?.mongoId,
        senderName: user?.name,
        text,
        type: 'text',
        createdAt: new Date().toISOString(),
        isOffline: true,
      };
      setMessages(prev => [...prev, offlineMsg]);

      // Save to SQLite for later sync
      await saveOfflineMessage({
        id: offlineMsg._id,
        conversationId: id,
        senderId: user?.mongoId,
        senderName: user?.name,
        text,
        type: 'text',
      });

      // Try BLE broadcast to nearby peers
      try {
        await sendOfflineMessage(id, text);
      } catch (e) {
        // BLE may not be available, message still saved locally
      }
    } else {
      // Online: send to server
      try {
        const res = await chatAPI.sendMessage(id, { text, type: 'text' });
        const newMsg = res.data.message;
        setMessages(prev => [...prev, newMsg]);
        lastTimestampRef.current = newMsg.createdAt;
      } catch (e) {
        // Server failed - save offline as fallback
        const fallbackMsg = {
          _id: `offline-${Date.now()}`,
          conversationId: id,
          senderId: user?.mongoId,
          senderName: user?.name,
          text,
          type: 'text',
          createdAt: new Date().toISOString(),
          isOffline: true,
        };
        setMessages(prev => [...prev, fallbackMsg]);
        await saveOfflineMessage({
          id: fallbackMsg._id,
          conversationId: id,
          senderId: user?.mongoId,
          senderName: user?.name,
          text,
          type: 'text',
        });
      }
    }
  };

  const handleLongPress = (message) => {
    const isOwn = message.senderId === user?.mongoId;
    const options = ['Copy Text', ...(isOwn ? ['Delete'] : []), 'Cancel'];
    const cancelIdx = options.length - 1;
    const destructiveIdx = isOwn ? 1 : undefined;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIdx, destructiveButtonIndex: destructiveIdx },
        (idx) => {
          if (idx === 0) { /* copy - TODO clipboard */ }
          if (isOwn && idx === 1) handleDeleteMessage(message._id);
        }
      );
    } else {
      Alert.alert('Message', null, [
        { text: 'Copy Text' },
        ...(isOwn ? [{ text: 'Delete', style: 'destructive', onPress: () => handleDeleteMessage(message._id) }] : []),
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      await chatAPI.deleteMessage(msgId);
      setMessages(prev => prev.filter(m => m._id !== msgId));
    } catch (e) {}
  };

  const isGroup = conversation?.type !== '1:1';
  const otherParticipant = !isGroup
    ? conversation?.participants?.find(p => (p.userId?._id || p.userId)?.toString() !== user?.mongoId)
    : null;
  const headerTitle = isGroup ? (conversation?.name || 'Group') : (otherParticipant?.userId?.name || 'Chat');

  const handleLeave = () => {
    Alert.alert('Leave Group', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive', onPress: async () => {
          await chatAPI.leaveGroup(id);
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/chat')}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>{headerTitle}</Text>
          {isGroup && <Text style={[s.headerSub, { color: colors.textMuted }]}>{conversation?.participants?.length} members</Text>}
        </View>
        {isGroup && (
          <TouchableOpacity onPress={handleLeave}>
            <Ionicons name="exit-outline" size={22} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {chatMode === 'offline' && <OfflineIndicator />}

      <KeyboardAvoidingView
        style={s.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* WhatsApp-style chat background */}
        <View style={[s.chatBg, { backgroundColor: colors.background }]}>
          {/* Subtle pattern overlay */}
          <View style={s.patternOverlay}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Text key={i} style={[s.patternIcon, { color: colors.border, opacity: 0.3 }]}>
                {['✈️', '🗺', '🧳', '🏔', '🌴', '📍', '🚆', '⛵', '🏖', '🌍', '📸', '🧭'][i]}
              </Text>
            ))}
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwn={item.senderId === user?.mongoId}
              isGroup={isGroup}
              onLongPress={handleLongPress}
            />
          )}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.3}
          contentContainerStyle={s.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onScrollBeginDrag={Keyboard.dismiss}
          style={s.flatList}
        />

        <MessageInput onSend={handleSend} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, gap: spacing.md, zIndex: 10 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  headerSub: { fontSize: 12 },
  keyboardAvoid: { flex: 1 },
  chatBg: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  patternOverlay: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', alignItems: 'center', paddingTop: 40, paddingHorizontal: 20, gap: 50 },
  patternIcon: { fontSize: 28 },
  flatList: { zIndex: 1 },
  messageList: { paddingVertical: spacing.md, paddingBottom: spacing.sm },
});
