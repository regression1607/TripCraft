import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../../context/SettingsContext';
import { spacing, borderRadius } from '../../styles/theme';

function getRelativeTime(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function AvatarCircle({ participant, size = 48, colors }) {
  const avatar = participant?.userId?.avatar || participant?.avatar;
  const name = participant?.userId?.name || participant?.name || '?';

  if (avatar && avatar.length > 5) {
    return <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: size * 0.4, fontWeight: '700', color: colors.primary }}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export default function ChatListItem({ conversation, currentUserId, onPress }) {
  const { colors } = useSettings();

  const isGroup = conversation.type !== '1:1';
  const otherParticipant = !isGroup
    ? conversation.participants?.find(p => (p.userId?._id || p.userId)?.toString() !== currentUserId?.toString())
    : null;

  const displayName = isGroup
    ? conversation.name || 'Group Chat'
    : otherParticipant?.userId?.name || 'User';

  const username = isGroup ? null : otherParticipant?.userId?.username;

  const lastMsg = conversation.lastMessage;
  let preview = '';
  if (lastMsg?.text) {
    if (isGroup && lastMsg.senderName) {
      preview = `${lastMsg.senderName}: ${lastMsg.text}`;
    } else {
      preview = lastMsg.text;
    }
  }

  const unread = conversation.unreadCount || 0;
  const icon = conversation.type === 'trip-group' ? 'airplane' : isGroup ? 'people' : null;

  return (
    <TouchableOpacity style={[s.container, { borderBottomColor: colors.border }]} activeOpacity={0.7} onPress={onPress}>
      <View style={s.avatarCol}>
        {isGroup ? (
          <View style={[s.groupAvatar, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name={icon} size={22} color={colors.primary} />
          </View>
        ) : (
          <AvatarCircle participant={otherParticipant} colors={colors} />
        )}
      </View>

      <View style={s.content}>
        <Text style={[s.name, { color: colors.textPrimary }]} numberOfLines={1}>{displayName}</Text>
        {username && <Text style={[s.username, { color: colors.textMuted }]}>@{username}</Text>}
        {preview ? <Text style={[s.preview, { color: colors.textSecondary }]} numberOfLines={1}>{preview}</Text> : null}
      </View>

      <View style={s.right}>
        <Text style={[s.time, { color: colors.textMuted }]}>{getRelativeTime(lastMsg?.timestamp)}</Text>
        {unread > 0 && (
          <View style={[s.badge, { backgroundColor: colors.primary }]}>
            <Text style={s.badgeText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export { AvatarCircle };

const s = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderBottomWidth: 1 },
  avatarCol: { marginRight: spacing.md },
  groupAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, marginRight: spacing.sm },
  name: { fontSize: 16, fontWeight: '600' },
  username: { fontSize: 12, marginTop: 1 },
  preview: { fontSize: 14, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  time: { fontSize: 12 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
});
