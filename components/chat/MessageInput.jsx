import { View, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../../context/SettingsContext';
import { spacing, borderRadius } from '../../styles/theme';

export default function MessageInput({ onSend, disabled }) {
  const { colors } = useSettings();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const sendScale = useRef(new Animated.Value(0.8)).current;
  const sendOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const hasText = text.trim().length > 0;
    Animated.parallel([
      Animated.spring(sendScale, { toValue: hasText ? 1 : 0.8, useNativeDriver: true, friction: 5 }),
      Animated.timing(sendOpacity, { toValue: hasText ? 1 : 0.4, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [text]);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    // Bounce animation on send
    Animated.sequence([
      Animated.spring(sendScale, { toValue: 0.6, useNativeDriver: true, friction: 5 }),
      Animated.spring(sendScale, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    onSend(text.trim());
    setText('');
  };

  return (
    <View style={[s.container, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={[s.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <TextInput
          style={[s.input, { color: colors.textPrimary }]}
          placeholder="Type a message..."
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
          editable={!disabled}
        />
      </View>
      <Animated.View style={{ transform: [{ scale: sendScale }], opacity: sendOpacity }}>
        <TouchableOpacity
          style={[s.sendBtn, { backgroundColor: colors.primary }]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
          activeOpacity={0.7}
        >
          <Ionicons name="send" size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, gap: spacing.sm },
  inputWrap: { flex: 1, borderRadius: 22, borderWidth: 1, paddingHorizontal: spacing.lg, minHeight: 44, maxHeight: 120, justifyContent: 'center' },
  input: { fontSize: 16, paddingVertical: spacing.sm, lineHeight: 22 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
