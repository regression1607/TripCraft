import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../../context/SettingsContext';
import { spacing } from '../../styles/theme';

export default function MessageBubble({ message, isOwn, isGroup, onLongPress }) {
  const { colors, darkMode } = useSettings();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 100 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  if (message.type === 'system') {
    return (
      <View style={s.systemContainer}>
        <View style={[s.systemBadge, { backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
          <Text style={[s.systemText, { color: colors.textMuted }]}>{message.text}</Text>
        </View>
      </View>
    );
  }

  const time = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '';

  // WhatsApp-style colors
  const sentBg = colors.primary;
  const receivedBg = darkMode ? '#1F2C34' : '#FFFFFF';
  const sentTextColor = '#FFFFFF';
  const receivedTextColor = colors.textPrimary;

  return (
    <Animated.View style={[s.row, isOwn ? s.rowRight : s.rowLeft, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onLongPress={() => onLongPress?.(message)}
        delayLongPress={300}
        style={[
          s.bubble,
          isOwn
            ? [s.bubbleSent, { backgroundColor: sentBg }]
            : [s.bubbleReceived, { backgroundColor: receivedBg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }],
        ]}
      >
        {/* WhatsApp-style tail */}
        <View style={[
          s.tail,
          isOwn
            ? [s.tailRight, { borderLeftColor: sentBg }]
            : [s.tailLeft, { borderRightColor: receivedBg }],
        ]} />

        {isGroup && !isOwn && message.senderName && (
          <Text style={[s.senderName, { color: colors.secondary }]}>
            {message.senderName}
          </Text>
        )}
        <Text style={[s.text, { color: isOwn ? sentTextColor : receivedTextColor }]}>
          {message.text}
        </Text>
        <View style={s.timeRow}>
          <Text style={[s.time, { color: isOwn ? 'rgba(255,255,255,0.65)' : colors.textMuted }]}>
            {time}
          </Text>
          {isOwn && (
            <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.65)" style={{ marginLeft: 3 }} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  row: { marginVertical: 1, paddingHorizontal: spacing.md },
  rowRight: { alignItems: 'flex-end' },
  rowLeft: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 4,
    borderRadius: 12,
    position: 'relative',
  },
  bubbleSent: { borderTopRightRadius: 2, marginRight: 6 },
  bubbleReceived: { borderTopLeftRadius: 2, marginLeft: 6 },
  tail: { position: 'absolute', top: 0, width: 0, height: 0, borderTopWidth: 8, borderTopColor: 'transparent' },
  tailRight: { right: -6, borderLeftWidth: 8 },
  tailLeft: { left: -6, borderRightWidth: 8 },
  senderName: { fontSize: 12, fontWeight: '700', marginBottom: 1 },
  text: { fontSize: 15.5, lineHeight: 21 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2 },
  time: { fontSize: 10.5 },
  systemContainer: { alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.xl },
  systemBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8 },
  systemText: { fontSize: 12 },
});
