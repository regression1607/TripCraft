import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../context/SettingsContext';
import { spacing, borderRadius, shadows } from '../styles/theme';

export default function UndoSnackbar({ message, onUndo, onDismiss }) {
  const { colors } = useSettings();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 20, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss?.());
  }, [onDismiss]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(dismiss, 5000);
    return () => clearTimeout(timer);
  }, [dismiss]);

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: colors.textPrimary, bottom: 20 + insets.bottom, opacity: fadeAnim, transform: [{ translateY }] }]}
    >
      <View style={styles.content}>
        <Ionicons name="arrow-undo" size={18} color="#FFFFFF" />
        <Text style={styles.message} numberOfLines={1}>{message}</Text>
      </View>
      <TouchableOpacity onPress={onUndo} style={styles.undoButton}>
        <Text style={[styles.undoText, { color: colors.primary }]}>UNDO</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20, // overridden inline with insets
    left: spacing.xl,
    right: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  message: { fontSize: 14, color: '#FFFFFF', flex: 1 },
  undoButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  undoText: { fontSize: 14, fontWeight: '700' },
});
