import React, { useMemo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { router } from "expo-router";

export default function MapsScreen() {
  const { posts } = useStore();

  // Dynamically require react-native-maps only on native to avoid web import errors
  const isWeb = Platform.OS === "web";
  // Use eval-based require so bundlers don't statically include native module on web
  const Maps = React.useMemo(() => {
    if (isWeb) return null as any;
    // eslint-disable-next-line no-eval
    const req = eval('require');
    return req('react-native-maps');
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
        <Maps.default style={styles.map} initialRegion={initialRegion}>
          {posts.map((p) => (
            <Maps.Marker
              key={p.id}
              coordinate={{ latitude: p.location.lat, longitude: p.location.lon }}
              title={p.title}
              description={`Visitors ${p.visitors.length}`}
              onCalloutPress={() => router.push(`/post/${p.id}` as any)}
            />
          ))}
        </Maps.default>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  text: { color: "#fff", textAlign: "center" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  map: { flex: 1 },
});
