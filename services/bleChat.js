import { Platform, PermissionsAndroid } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { saveOfflineMessage } from './offlineChat';

const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const TX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write to peripheral
const RX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Read from peripheral

let manager = null;
let currentUser = null;
let onMessageCallback = null;
let discoveredDevices = new Map();

// Initialize BLE manager
export function initBLE(user) {
  if (manager) return;
  try {
    manager = new BleManager();
    currentUser = user;
    console.log('[BLE] Manager initialized');
  } catch (e) {
    console.log('[BLE] Failed to initialize:', e.message);
    manager = null;
  }
}

export function isAvailable() {
  return !!manager;
}

// Request permissions (Android 12+)
async function requestPermissions() {
  if (Platform.OS === 'android') {
    const apiLevel = Platform.Version;
    if (apiLevel >= 31) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(result).every(v => v === 'granted');
    } else {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return result === 'granted';
    }
  }
  return true; // iOS handles via Info.plist
}

// Scan for nearby devices running TripCraft
export async function startScanning(onDeviceFound) {
  if (!manager) {
    console.log('[BLE] Manager not initialized');
    return false;
  }

  const permitted = await requestPermissions();
  if (!permitted) {
    console.log('[BLE] Permissions denied');
    return false;
  }

  // Check BLE state
  const state = await manager.state();
  if (state !== 'PoweredOn') {
    console.log('[BLE] Bluetooth not powered on:', state);
    return false;
  }

  discoveredDevices.clear();
  console.log('[BLE] Starting scan...');

  manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
    if (error) {
      console.log('[BLE] Scan error:', error.message);
      return;
    }

    if (!device || !device.name) return;

    // Look for TripCraft devices (name starts with "TC:")
    if (device.name.startsWith('TC:') || device.localName?.startsWith('TC:')) {
      const deviceName = (device.name || device.localName).replace('TC:', '');
      if (!discoveredDevices.has(device.id)) {
        discoveredDevices.set(device.id, true);
        console.log('[BLE] Found TripCraft user:', deviceName);
        onDeviceFound({
          id: device.id,
          name: deviceName,
          rssi: device.rssi,
          raw: device,
        });
      }
    }
  });

  return true;
}

export function stopScanning() {
  if (manager) {
    manager.stopDeviceScan();
    console.log('[BLE] Scan stopped');
  }
}

// Connect to a device and send a message
export async function sendP2PMessage(deviceId, text) {
  if (!manager || !currentUser) return false;

  try {
    console.log('[BLE] Connecting to:', deviceId);
    const device = await manager.connectToDevice(deviceId, { timeout: 10000 });
    await device.discoverAllServicesAndCharacteristics();

    const payload = JSON.stringify({
      v: 1,
      type: 'msg',
      id: `ble-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      from: {
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.username,
      },
      text,
      ts: Date.now(),
    });

    // Chunk payload into BLE-safe sizes (max ~500 bytes per write)
    const chunks = chunkString(payload, 480);
    for (let i = 0; i < chunks.length; i++) {
      const header = `${i}/${chunks.length}:`;
      const data = btoa(header + chunks[i]); // base64 encode
      await device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        TX_CHAR_UUID,
        data
      );
    }

    console.log('[BLE] Message sent:', text.slice(0, 30));

    // Also save locally for sync later
    await saveOfflineMessage({
      id: `ble-${Date.now()}`,
      conversationId: `ble-${deviceId}`,
      text,
      type: 'text',
    });

    await device.cancelConnection();
    return true;
  } catch (e) {
    console.log('[BLE] Send error:', e.message);
    return false;
  }
}

// Listen for incoming messages (when acting as peripheral)
export function onMessage(callback) {
  onMessageCallback = callback;
}

// Start advertising as a peripheral (so others can find us)
export async function startAdvertising() {
  if (!manager || !currentUser) return false;

  // Note: react-native-ble-plx doesn't natively support peripheral mode
  // For full peripheral advertising, you'd need react-native-ble-peripheral
  // For now, we use the device name in scan to identify TripCraft users
  console.log('[BLE] Advertising not fully supported in ble-plx. Users discoverable via scanning.');
  return true;
}

export function stopAdvertising() {
  // No-op for ble-plx
}

// Cleanup
export function destroyBLE() {
  if (manager) {
    stopScanning();
    manager.destroy();
    manager = null;
    console.log('[BLE] Destroyed');
  }
}

// Helper: split string into chunks
function chunkString(str, size) {
  const chunks = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}

// Helper: base64 encode (React Native compatible)
function btoa(str) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  for (let i = 0; i < str.length; i += 3) {
    const a = str.charCodeAt(i);
    const b = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
    const c = i + 2 < str.length ? str.charCodeAt(i + 2) : 0;
    output += chars[a >> 2] + chars[((a & 3) << 4) | (b >> 4)] +
      (i + 1 < str.length ? chars[((b & 15) << 2) | (c >> 6)] : '=') +
      (i + 2 < str.length ? chars[c & 63] : '=');
  }
  return output;
}
