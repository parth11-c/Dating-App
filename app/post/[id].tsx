import React from "react";
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, TextInput } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useStore } from "@/store";
import * as Location from "expo-location";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPost, verifyVisit } = useStore();
  const post = id ? getPost(id) : undefined;
  const insets = useSafeAreaInsets();

  const [lat, setLat] = React.useState("");
  const [lon, setLon] = React.useState("");

  if (!post) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Post not found.</Text>
      </View>
    );
  }

  const onVerify = async () => {
    const latNum = Number(lat);
    const lonNum = Number(lon);
    if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
      Alert.alert("Invalid", "Enter valid coordinates to verify your visit.");
      return;
    }
    const res = await verifyVisit(post.id, { lat: latNum, lon: lonNum });
    if (res.ok) Alert.alert("Verified", "You have been added to the visitors list.");
    else Alert.alert("Not verified", res.reason);
  };

  const useCurrentLocationToVerify = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "We need location permission to verify your visit.");
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    setLat(String(pos.coords.latitude));
    setLon(String(pos.coords.longitude));
    const res = await verifyVisit(post.id, { lat: pos.coords.latitude, lon: pos.coords.longitude });
    if (res.ok) Alert.alert("Verified", "You have been added to the visitors list.");
    else Alert.alert("Not verified", res.reason);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80 }]}>
        <Image source={{ uri: post.imageUri }} style={styles.image} />
        <Text style={styles.title}>{post.title}</Text>
        {!!post.description && <Text style={styles.desc}>{post.description}</Text>}
        <Text style={styles.meta}>
          Created {new Date(post.createdAt).toLocaleString()} • Visitors {post.visitors.length}
        </Text>

        <View style={styles.verifyBox}>
          <Text style={styles.section}>Verify your visit</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={useCurrentLocationToVerify}>
            <Text style={styles.secondaryButtonText}>Use Current Location to Verify</Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <TextInput
              placeholder="Latitude"
              placeholderTextColor="#777"
              style={[styles.input, styles.half]}
              keyboardType="decimal-pad"
              value={lat}
              onChangeText={setLat}
            />
            <TextInput
              placeholder="Longitude"
              placeholderTextColor="#777"
              style={[styles.input, styles.half, { marginLeft: 8 }]}
              keyboardType="decimal-pad"
              value={lon}
              onChangeText={setLon}
            />
          </View>
        <TouchableOpacity style={styles.button} onPress={onVerify}>
          <Text style={styles.buttonText}>Scan & Verify</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>Visitors</Text>
      {post.visitors.length === 0 ? (
        <Text style={styles.muted}>No visitors yet.</Text>
      ) : (
        post.visitors.map((v) => (
          <View key={`${v.userId}_${v.visitedAt}`} style={styles.visitor}>
            <Text style={styles.text}>User {v.userId}</Text>
            <Text style={styles.muted}>{new Date(v.visitedAt).toLocaleString()}</Text>
          </View>
        ))
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { padding: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0a0a0a" },
  image: { width: "100%", height: 260, backgroundColor: "#222", borderRadius: 12 },
  title: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 12 },
  desc: { color: "#ddd", marginTop: 8 },
  meta: { color: "#aaa", marginTop: 8, marginBottom: 12 },
  section: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 10, marginBottom: 6 },
  verifyBox: { backgroundColor: "#111", borderColor: "#222", borderWidth: 1, borderRadius: 12, padding: 12 },
  row: { flexDirection: "row" },
  input: { backgroundColor: "#111", color: "#fff", borderColor: "#333", borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  half: { flex: 1 },
  button: { backgroundColor: "#fff", paddingVertical: 12, borderRadius: 10, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#000", fontWeight: "600" },
  secondaryButton: { backgroundColor: "#222", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderColor: "#333", borderWidth: 1, marginBottom: 8 },
  secondaryButtonText: { color: "#fff" },
  text: { color: "#fff" },
  muted: { color: "#9aa0a6" },
  visitor: { paddingVertical: 8, borderBottomColor: "#222", borderBottomWidth: 1 },
});
