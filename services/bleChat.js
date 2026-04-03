import { Platform, PermissionsAndroid } from 'react-native';
import { saveOfflineMessage, getOfflineMessages } from './offlineChat';

const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const TX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const RX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

let BleManager = null;
let manager = null;
let currentUser = null;
let isScanning = false;
let connectedPeers = new Map(); // deviceId -> { name, device }
let messageListeners = []; // callbacks for incoming messages
let peerListeners = []; // callbacks for peer discovery

// ─── INIT ───────────────────────────────────────────────────────────────────

export function initBLE(user) {
  currentUser = user;
  try {
    const ble = require('react-native-ble-plx');
    BleManager = ble.BleManager;
    manager = new BleManager();
    console.log('[BLE] Initialized');
    return true;
  } catch (e) {
    console.log('[BLE] Not available (Expo Go):', e.message);
    return false;
  }
}

export function isAvailable() {
  return !!manager;
}

export function destroyBLE() {
  stopScanning();
  connectedPeers.clear();
  if (manager) { manager.destroy(); manager = null; }
}

// ─── PERMISSIONS ────────────────────────────────────────────────────────────

async function requestPermissions() {
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return Object.values(result).every(v => v === 'granted');
  } else if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return result === 'granted';
  }
  return true;
}

// ─── SCANNING (discover nearby TripCraft users) ─────────────────────────────

export async function startScanning() {
  if (!manager || isScanning) return false;

  const permitted = await requestPermissions();
  if (!permitted) return false;

  const state = await manager.state();
  if (state !== 'PoweredOn') return false;

  isScanning = true;
  console.log('[BLE] Scanning started');

  manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
    if (error) return;
    if (!device?.name) return;

    // TripCraft devices advertise with "TC:" prefix
    if (device.name.startsWith('TC:') || device.localName?.startsWith('TC:')) {
      const peerName = (device.name || device.localName).replace('TC:', '');
      if (!connectedPeers.has(device.id)) {
        connectedPeers.set(device.id, { name: peerName, device, rssi: device.rssi });
        console.log('[BLE] Found peer:', peerName);
        peerListeners.forEach(cb => cb(getPeers()));
      }
    }
  });

  return true;
}

export function stopScanning() {
  if (manager && isScanning) {
    manager.stopDeviceScan();
    isScanning = false;
    console.log('[BLE] Scanning stopped');
  }
}

// ─── PEERS ──────────────────────────────────────────────────────────────────

export function getPeers() {
  return Array.from(connectedPeers.entries()).map(([id, info]) => ({
    id,
    name: info.name,
    rssi: info.rssi,
  }));
}

export function onPeerDiscovered(callback) {
  peerListeners.push(callback);
  return () => { peerListeners = peerListeners.filter(cb => cb !== callback); };
}

// ─── SEND MESSAGE (works for 1:1 and groups) ───────────────────────────────

export async function sendOfflineMessage(conversationId, text, type = 'text', metadata = null) {
  if (!currentUser) return false;

  const messageId = `ble-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const message = {
    id: messageId,
    conversationId,
    senderId: currentUser.mongoId || currentUser.id,
    senderName: currentUser.name,
    text,
    type,
    metadata,
    createdAt: Date.now(),
    sentViaBLE: true,
  };

  // Save to local SQLite (will sync when online)
  await saveOfflineMessage({
    id: messageId,
    conversationId,
    text,
    type,
    metadata,
  });

  // Broadcast to all connected BLE peers (for group chat)
  if (manager) {
    const payload = JSON.stringify(message);
    for (const [deviceId, peer] of connectedPeers) {
      try {
        await sendToPeer(deviceId, payload);
      } catch (e) {
        console.log('[BLE] Failed to send to', peer.name);
      }
    }
  }

  // Notify local listeners (so UI updates immediately)
  messageListeners.forEach(cb => cb(message));

  return message;
}

async function sendToPeer(deviceId, payload) {
  if (!manager) return;
  try {
    const device = await manager.connectToDevice(deviceId, { timeout: 5000 });
    await device.discoverAllServicesAndCharacteristics();

    // Chunk if needed (BLE max ~500 bytes per write)
    const chunks = chunkString(payload, 480);
    for (let i = 0; i < chunks.length; i++) {
      const header = `${i}/${chunks.length}:`;
      const data = base64Encode(header + chunks[i]);
      await device.writeCharacteristicWithResponseForService(SERVICE_UUID, TX_CHAR_UUID, data);
    }

    await device.cancelConnection();
    console.log('[BLE] Sent to peer:', deviceId.slice(0, 8));
  } catch (e) {
    console.log('[BLE] Peer send error:', e.message);
  }
}

// ─── RECEIVE MESSAGES ───────────────────────────────────────────────────────

export function onMessageReceived(callback) {
  messageListeners.push(callback);
  return () => { messageListeners = messageListeners.filter(cb => cb !== callback); };
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function chunkString(str, size) {
  const chunks = [];
  for (let i = 0; i < str.length; i += size) chunks.push(str.slice(i, i + size));
  return chunks;
}

function base64Encode(str) {
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
