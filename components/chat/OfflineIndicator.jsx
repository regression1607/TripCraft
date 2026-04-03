import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../../context/SettingsContext';
import { spacing } from '../../styles/theme';

export default function OfflineIndicator() {
  const { colors } = useSettings();
  return (
    <View style={[s.container, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
      <Ionicons name="cloud-offline" size={16} color={colors.warning} />
      <Text style={[s.text, { color: colors.warning }]}>You're offline. Messages will sync when connected.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  text: { fontSize: 13, flex: 1 },
});
