import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../../context/SettingsContext';
import { tripsAPI } from '../../services/api';
import { spacing } from '../../styles/theme';

function generateExploreMapHTML(trips) {
  const markers = trips
    .filter((t) => t.destination?.lat && t.destination?.lng)
    .map((t) => ({
      lat: t.destination.lat,
      lng: t.destination.lng,
      name: t.destination.name,
      days: t.days,
      budget: t.budget?.amount,
      id: t._id,
    }));

  if (markers.length === 0) return null;

  const center = [markers[0].lat, markers[0].lng];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; }
    .zoom-controls {
      position: absolute; top: 12px; left: 12px; z-index: 1000;
      display: flex; flex-direction: column; gap: 6px;
    }
    .zoom-btn {
      width: 40px; height: 40px; border-radius: 10px;
      background: white; border: none; font-size: 22px; font-weight: bold;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #1A1A2E;
    }
    .zoom-btn:active { background: #f0f0f0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="zoom-controls">
    <button class="zoom-btn" onclick="map.zoomIn()">+</button>
    <button class="zoom-btn" onclick="map.zoomOut()">&minus;</button>
  </div>
  <script>
    const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${center[0]}, ${center[1]}], 4);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

    const markers = ${JSON.stringify(markers)};
    const bounds = [];

    markers.forEach((m) => {
      const icon = L.divIcon({
        className: '',
        html: '<div style="background:#FF6B35;color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 6px rgba(0,0,0,0.35);border:2px solid white;">📍</div>',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      L.marker([m.lat, m.lng], { icon })
        .addTo(map)
        .bindPopup('<b>' + (m.name||'').replace(/</g,'&lt;') + '</b><br>' + m.days + ' days · $' + m.budget);
      bounds.push([m.lat, m.lng]);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView(bounds[0], 10);
    }
  </script>
</body>
</html>`;
}

export default function MapScreen() {
  const { colors } = useSettings();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const res = await tripsAPI.getAll();
      setTrips(res.data.trips || []);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const html = generateExploreMapHTML(trips);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Explore Map</Text>
      {html ? (
        <View style={styles.mapContainer}>
          <WebView
            source={{ html }}
            style={styles.map}
            originWhitelist={['*']}
            javaScriptEnabled
            userAgent="TripCraft/1.0"
          />
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="map-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
            {loading ? 'Loading your trips...' : 'No trips with locations yet'}
          </Text>
          <Text style={[styles.placeholderSubtext, { color: colors.textMuted }]}>
            {!loading && 'Generate an itinerary to see places on the map'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    marginBottom: spacing.md,
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
