import React, { useMemo } from "react";
import { View, Text, StyleSheet, Platform, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { router } from "expo-router";
import * as Location from "expo-location";
import { Image } from "expo-image";

export default function MapsScreen() {
  const { posts } = useStore();

  // Dynamically require react-native-maps only on native to avoid web import errors
  const isWeb = Platform.OS === "web";
  // Use eval-based require so bundlers don't statically include native module on web
  const Maps = React.useMemo(() => {
    if (isWeb) return null as any;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-maps');
  }, [isWeb]);

  type Region = {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };

  const initialRegion: Region = useMemo(() => {
    if (posts.length > 0) {
      const p = posts[0];
      return { latitude: p.location.lat, longitude: p.location.lon, latitudeDelta: 0.02, longitudeDelta: 0.02 };
    }
    // Default to a world view-ish region
    return { latitude: 20, longitude: 0, latitudeDelta: 60, longitudeDelta: 60 };
  }, [posts]);

  // UI state
  const [mapType, setMapType] = React.useState<'standard' | 'satellite'>("standard");
  const [locating, setLocating] = React.useState(false);
  const [userLoc, setUserLoc] = React.useState<{ latitude: number; longitude: number } | null>(null);

  // Map ref (typed as any to avoid web/native type issues)
  const mapRef = React.useRef<any>(null);


  const locateMe = React.useCallback(async () => {
    if (isWeb || !mapRef.current) return;
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      setUserLoc({ latitude, longitude });
      mapRef.current.animateCamera?.({ center: { latitude, longitude }, zoom: 14 }, { duration: 800 });
    } catch (e) {
      // noop
    } finally {
      setLocating(false);
    }
  }, [isWeb]);

  // On mount, attempt to get user location once (native only)
  React.useEffect(() => {
    if (isWeb) return;
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!mounted) return;
        const { latitude, longitude } = pos.coords;
        setUserLoc({ latitude, longitude });
      } catch {}
    })();
    return () => { mounted = false; };
  }, [isWeb]);

  

  // Compute top visitors count to color pins
  const maxVisitors = React.useMemo(() => posts.reduce((m, p) => Math.max(m, p.visitors?.length ?? 0), 0), [posts]);
  const pinColorFor = (count: number) => {
    if (maxVisitors <= 1) return "#3EA6FF"; // default blue
    const ratio = count / maxVisitors; // 0..1
    // interpolate from blue -> purple -> pink
    if (ratio > 0.66) return "#FF5C93"; // top
    if (ratio > 0.33) return "#8B5CF6"; // mid
    return "#3EA6FF"; // low
  };

  return (
    <SafeAreaView style={styles.container}>
      {posts.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.text}>No posts yet. Create one to see it on the map.</Text>
        </View>
      ) : isWeb ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.text}>Map preview is not available on web. Please run on iOS/Android.</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <Maps.default
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            mapType={mapType}
            showsUserLocation
          >
            {posts.map((p) => (
              <Maps.Marker
                key={p.id}
                identifier={p.id}
                coordinate={{ latitude: p.location.lat, longitude: p.location.lon }}
                anchor={{ x: 0.5, y: 1 }}
                onPress={() => router.push(`/post/${p.id}` as any)}
                tracksViewChanges={false}
              >
                <View style={styles.markerWrap}>
                  <View style={[styles.thumbMarker, { borderColor: pinColorFor(p.visitors.length) }]}>
                    <Image source={{ uri: p.imageUri }} style={styles.thumbImage} contentFit="cover" />
                  </View>
                  <View style={[styles.tail, { borderTopColor: pinColorFor(p.visitors.length) }]} />
                </View>
              </Maps.Marker>
            ))}
          </Maps.default>

          {/* Floating Controls */}
          <View pointerEvents="box-none" style={styles.overlay}>
            <View style={styles.topRow}>
              <View style={styles.badge}><Text style={styles.badgeText}>Top spots highlighted</Text></View>
              <TouchableOpacity style={styles.chip} onPress={() => setMapType((t) => (t === 'standard' ? 'satellite' : 'standard'))}>
                <Text style={styles.chipText}>{mapType === 'standard' ? 'Satellite' : 'Standard'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.rightCol}>
              <TouchableOpacity style={styles.fab} onPress={locateMe} disabled={locating}>
                {locating ? <ActivityIndicator color="#000" /> : <Text style={styles.fabText}>Me</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  text: { color: "#fff", textAlign: "center" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  map: { flex: 1 },
  overlay: { position: 'absolute', top: 12, left: 12, right: 12, bottom: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rightCol: { position: 'absolute', right: 0, bottom: 0, gap: 12 },
  fab: { backgroundColor: '#fff', height: 44, width: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  fabText: { color: '#000', fontWeight: '600' },
  chip: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, alignSelf: 'flex-start' },
  chipText: { color: '#000', fontWeight: '600' },
  badge: { backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { color: '#fff', fontSize: 12 },
  markerWrap: { alignItems: 'center', paddingBottom: 8 },
  thumbMarker: { width: 46, height: 46, borderRadius: 10, overflow: 'hidden', backgroundColor: '#222', borderWidth: 2 },
  thumbImage: { width: '100%', height: '100%' },
  tail: { width: 0, height: 0, marginTop: -2, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  nearCard: { position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: '#111', borderRadius: 14, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  nearThumb: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#222' },
  nearTitle: { color: '#fff', fontWeight: '700' },
  nearMeta: { color: '#bbb', marginTop: 2 },
});

