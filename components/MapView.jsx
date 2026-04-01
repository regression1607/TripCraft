import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../context/SettingsContext';
import { spacing } from '../styles/theme';

const dayColors = ['#FF6B35', '#2EC4B6', '#6366F1', '#EC4899', '#F59E0B', '#10B981', '#8B5CF6'];

function generateMapHTML(days) {
  const allMarkers = [];
  const dayRoutes = [];

  days?.forEach((day) => {
    const route = [];
    day.activities?.forEach((activity) => {
      if (activity.location?.lat && activity.location?.lng) {
        allMarkers.push({
          lat: activity.location.lat,
          lng: activity.location.lng,
          title: activity.title,
          day: day.dayNumber,
          time: activity.time,
        });
        route.push([activity.location.lat, activity.location.lng]);
      }
    });
    if (route.length > 1) {
      dayRoutes.push({ dayNumber: day.dayNumber, coords: route });
    }
  });

  if (allMarkers.length === 0) return null;

  const center = [allMarkers[0].lat, allMarkers[0].lng];

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
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
    }).setView([${center[0]}, ${center[1]}], 13);

    // Use CartoDB tiles - no blocking issues
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    const markers = ${JSON.stringify(allMarkers)};
    const routes = ${JSON.stringify(dayRoutes)};
    const dayColors = ${JSON.stringify(dayColors)};
    const bounds = [];

    markers.forEach((m) => {
      const color = dayColors[(m.day - 1) % dayColors.length];
      const icon = L.divIcon({
        className: '',
        html: '<div style="background:' + color + ';color:white;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.35);border:2px solid white;">' + m.day + '</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      L.marker([m.lat, m.lng], { icon })
        .addTo(map)
        .bindPopup('<b>' + (m.title||'').replace(/</g,'&lt;') + '</b><br>Day ' + m.day + ' · ' + (m.time||'').replace(/</g,'&lt;'));
      bounds.push([m.lat, m.lng]);
    });

    routes.forEach((r) => {
      const color = dayColors[(r.dayNumber - 1) % dayColors.length];
      L.polyline(r.coords, { color, weight: 3, opacity: 0.8, dashArray: '8,6' }).addTo(map);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    }
  </script>
</body>
</html>`;
}

export default function MapView({ days, style }) {
  const { colors } = useSettings();
  const webViewRef = useRef(null);
  const html = generateMapHTML(days);

  if (!html) {
    return (
      <View style={[styles.empty, style]}>
        <Ionicons name="map-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No locations to show</Text>
        <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Generate an itinerary to see places on the map</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        scrollEnabled={false}
        userAgent="TripCraft/1.0"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
  },
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.lg,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
