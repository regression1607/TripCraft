import { View, Text, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing } from '../styles/theme';
import { useSettings } from '../context/SettingsContext';

const statusMessages = [
  { emoji: '🔍', text: 'Finding best spots...' },
  { emoji: '🍜', text: 'Picking restaurants...' },
  { emoji: '💰', text: 'Optimizing budget...' },
  { emoji: '🗺', text: 'Planning routes...' },
  { emoji: '🏨', text: 'Checking accommodation...' },
  { emoji: '☀️', text: 'Checking weather...' },
  { emoji: '🧳', text: 'Building packing list...' },
];

export default function LoadingItinerary({ destination }) {
  const { colors } = useSettings();
  const { width: screenWidth } = useWindowDimensions();
  const animWidth = Math.min(screenWidth * 0.65, 280);
  const [messageIndex, setMessageIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const flyAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const flyLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(flyAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(flyAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    flyLoop.start();

    const progressAnimation = Animated.timing(progressAnim, {
      toValue: 1,
      duration: 20000,
      useNativeDriver: false,
    });
    progressAnimation.start();

    const interval = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setMessageIndex((prev) => (prev + 1) % statusMessages.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 2500);

    return () => {
      flyLoop.stop();
      progressAnimation.stop();
      clearInterval(interval);
    };
  }, []);

  const translateX = flyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, animWidth - 50],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['5%', '90%'],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.animationArea, { width: animWidth }]}>
        <Animated.View style={[styles.airplane, { transform: [{ translateX }] }]}>
          <Ionicons name="airplane" size={32} color={colors.primary} />
        </Animated.View>
        <View style={styles.pinContainer}>
          <Ionicons name="location" size={28} color={colors.error} />
        </View>
      </View>

      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Crafting your perfect{'\n'}trip to {destination || 'your destination'}...
      </Text>

      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: colors.primary }]} />
      </View>

      <Animated.View style={[styles.statusMessage, { opacity: fadeAnim }]}>
        <Text style={styles.statusEmoji}>{statusMessages[messageIndex].emoji}</Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>{statusMessages[messageIndex].text}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  animationArea: {
    // width set inline via animWidth
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: spacing.xxxl,
  },
  airplane: {
    position: 'absolute',
    left: 0,
  },
  pinContainer: {
    marginRight: 10,
  },
  title: {
    ...typography.headingM,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 26,
  },
  progressBar: {
    width: '80%',
    height: 6,
    borderRadius: 3,
    marginBottom: spacing.xxl,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  statusMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusEmoji: {
    fontSize: 18,
  },
  statusText: {
    ...typography.bodySmall,
  },
});
