import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { initBLE, startScanning, stopScanning, sendP2PMessage, isAvailable, destroyBLE } from '../../services/bleChat';
import { spacing, borderRadius, shadows } from '../../styles/theme';

export default function NearbyScreen() {
  const { user } = useAuth();
  const { colors } = useSettings();
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState([]);
  const [bleReady, setBleReady] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    initBLE(user);
    setBleReady(isAvailable());
    return () => stopScanning();
  }, []);

  const handleStartScan = async () => {
    if (!bleReady) {
      Alert.alert('Bluetooth Required', 'Please enable Bluetooth and try again.');
      return;
    }

    setScanning(true);
    setDevices([]);

    const started = await startScanning((device) => {
      setDevices(prev => {
        if (prev.find(d => d.id === device.id)) return prev;
        return [...prev, device];
      });
    });

    if (!started) {
      Alert.alert('Scan Failed', 'Could not start Bluetooth scan. Make sure Bluetooth is enabled and permissions are granted.');
      setScanning(false);
      return;
    }

    setTimeout(() => {
      stopScanning();
      setScanning(false);
    }, 20000);
  };

  const handleSendMessage = async () => {
    if (!selectedDevice || !messageText.trim()) return;
    setSending(true);
    const success = await sendP2PMessage(selectedDevice.id, messageText.trim());
    setSending(false);
    if (success) {
      Alert.alert('Sent!', `Message sent to ${selectedDevice.name}`);
      setMessageText('');
      setSelectedDevice(null);
    } else {
      Alert.alert('Failed', 'Could not send message. Make sure the other device is nearby.');
    }
  };

  const estimateDistance = (rssi) => {
    if (!rssi) return 'Unknown distance';
    if (rssi > -50) return 'Very close (~5m)';
    if (rssi > -65) return 'Nearby (~15m)';
    if (rssi > -75) return 'Medium range (~40m)';
    if (rssi > -85) return 'Far (~80m)';
    return 'At range limit (~100m+)';
  };

  const getSignalBars = (rssi) => {
    if (!rssi) return 0;
    if (rssi > -50) return 4;
    if (rssi > -65) return 3;
    if (rssi > -75) return 2;
    return 1;
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/chat')}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.textPrimary }]}>Nearby Travelers</Text>
        <View style={{ width: 24 }} />
      </View>

      {!bleReady ? (
        <View style={s.empty}>
          <Ionicons name="bluetooth-outline" size={64} color={colors.textMuted} />
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Bluetooth Not Available</Text>
          <Text style={[s.emptyText, { color: colors.textSecondary }]}>
            To chat without internet, build the app with:{'\n\n'}
            eas build --platform android --profile preview{'\n\n'}
            Then install the APK on your phone.{'\n'}
            Both users need the APK + Bluetooth ON.{'\n'}
            Range: ~30-100 meters.
          </Text>
        </View>
      ) : (
        <>
          {/* Info card */}
          {!scanning && devices.length === 0 && (
            <View style={[s.infoCard, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="bluetooth" size={24} color={colors.primary} />
              <View style={s.infoText}>
                <Text style={[s.infoTitle, { color: colors.textPrimary }]}>No Internet? No Problem.</Text>
                <Text style={[s.infoDesc, { color: colors.textSecondary }]}>
                  Chat directly with nearby TripCraft users via Bluetooth. Works in mountains, flights, remote areas - anywhere without signal.
                </Text>
              </View>
            </View>
          )}

          {/* Scan Button */}
          <TouchableOpacity
            style={[s.scanBtn, { backgroundColor: scanning ? colors.error : colors.primary }]}
            onPress={scanning ? () => { stopScanning(); setScanning(false); } : handleStartScan}
            activeOpacity={0.8}
          >
            {scanning ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={s.scanBtnText}>Scanning... Tap to stop</Text>
              </>
            ) : (
              <>
                <Ionicons name="bluetooth" size={20} color="#FFFFFF" />
                <Text style={s.scanBtnText}>Scan for Nearby Travelers</Text>
              </>
            )}
          </TouchableOpacity>

          {scanning && devices.length === 0 && (
            <View style={s.scanningInfo}>
              <Text style={[s.scanningText, { color: colors.textSecondary }]}>Looking for TripCraft users nearby...</Text>
              <Text style={[s.scanningHint, { color: colors.textMuted }]}>Other users must also be scanning</Text>
            </View>
          )}

          {/* Device List */}
          <FlatList
            data={devices}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const bars = getSignalBars(item.rssi);
              const isSelected = selectedDevice?.id === item.id;
              return (
                <TouchableOpacity
                  style={[s.deviceCard, { backgroundColor: colors.card, borderColor: isSelected ? colors.primary : colors.border }, shadows.card]}
                  onPress={() => setSelectedDevice(isSelected ? null : item)}
                  activeOpacity={0.7}
                >
                  <View style={[s.bleIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="bluetooth" size={22} color={colors.primary} />
                  </View>
                  <View style={s.deviceInfo}>
                    <Text style={[s.deviceName, { color: colors.textPrimary }]}>{item.name}</Text>
                    <Text style={[s.deviceDistance, { color: colors.secondary }]}>{estimateDistance(item.rssi)}</Text>
                  </View>
                  <View style={s.signalBars}>
                    {[1, 2, 3, 4].map(i => (
                      <View key={i} style={[s.bar, { height: 4 + i * 4, backgroundColor: i <= bars ? colors.success : colors.border }]} />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={s.list}
          />

          {/* Send Message Panel */}
          {selectedDevice && (
            <View style={[s.sendPanel, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
              <Text style={[s.sendTo, { color: colors.textSecondary }]}>
                Send to: <Text style={{ color: colors.primary, fontWeight: '600' }}>{selectedDevice.name}</Text>
              </Text>
              <View style={s.sendRow}>
                <TextInput
                  style={[s.sendInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  placeholder="Type a message..."
                  placeholderTextColor={colors.textMuted}
                  value={messageText}
                  onChangeText={setMessageText}
                />
                <TouchableOpacity
                  style={[s.sendBtn, { backgroundColor: messageText.trim() ? colors.primary : colors.border }]}
                  onPress={handleSendMessage}
                  disabled={!messageText.trim() || sending}
                >
                  {sending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons name="send" size={18} color="#FFFFFF" />}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={s.footer}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
            <Text style={[s.footerText, { color: colors.textMuted }]}>
              Range: ~100m. Messages save locally and sync when back online.
            </Text>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  title: { fontSize: 20, fontWeight: '700' },
  infoCard: { flexDirection: 'row', marginHorizontal: spacing.xl, padding: spacing.lg, borderRadius: borderRadius.lg, gap: spacing.md, marginBottom: spacing.lg, alignItems: 'flex-start' },
  infoText: { flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  infoDesc: { fontSize: 13, lineHeight: 19 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginHorizontal: spacing.xl, paddingVertical: 15, borderRadius: borderRadius.md, marginBottom: spacing.md },
  scanBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  scanningInfo: { alignItems: 'center', paddingVertical: spacing.xl },
  scanningText: { fontSize: 15 },
  scanningHint: { fontSize: 13, marginTop: spacing.xs },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 200 },
  deviceCard: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.md, borderWidth: 1.5 },
  bleIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 16, fontWeight: '600' },
  deviceDistance: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  signalBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 4, borderRadius: 2 },
  sendPanel: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderTopWidth: 1 },
  sendTo: { fontSize: 13, marginBottom: spacing.sm },
  sendRow: { flexDirection: 'row', gap: spacing.sm },
  sendInput: { flex: 1, height: 44, borderRadius: 22, paddingHorizontal: spacing.lg, borderWidth: 1, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  footerText: { fontSize: 11, flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: spacing.lg },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: spacing.md },
});
