import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { fetchNearbyPosts, PostWithPlace } from '@/lib/posts';
import { useRouter } from 'expo-router';

export default function MapScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [locErr, setLocErr] = useState<string | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [posts, setPosts] = useState<PostWithPlace[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setLocErr(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocErr('Location permission denied');
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!mounted) return;
      const initial: Region = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(initial);
      try {
        const nearby = await fetchNearbyPosts(pos.coords.latitude, pos.coords.longitude, 1000);
        if (!mounted) return;
        setPosts(nearby);
      } catch (e: any) {
        setLocErr(e.message ?? 'Failed to load nearby posts');
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const provider = useMemo(() => (Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined), []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!region ? (
        <View style={styles.center}>
          {loading ? <ActivityIndicator color={colors.tint} /> : null}
          {locErr ? <Text style={{ color: colors.text }}>{locErr}</Text> : null}
        </View>
      ) : (
        <MapView
          style={StyleSheet.absoluteFill}
          provider={provider}
          initialRegion={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation
        >
          {posts.map((p) => (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.place.lat, longitude: p.place.lng }}
              title={p.place.title ?? 'Post'}
              description={p.caption ?? ''}
              onCalloutPress={() => router.push(`/post/${p.id}`)}
            />
          ))}
        </MapView>
      )}
      {/* FAB to create a new post */}
      <TouchableOpacity onPress={() => router.push('/create-post')} style={[styles.fab, { backgroundColor: colors.tint }]}>
        <Text style={{ color: colors.mode === 'dark' ? '#000' : '#fff', fontWeight: '800' }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  fab: { position: 'absolute', right: 16, bottom: 24, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 6 },
});
