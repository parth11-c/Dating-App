import React from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Image } from "react-native";
import { useStore } from "@/store";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";

export default function PostScreen() {
  const { createPost } = useStore();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [imageUri, setImageUri] = React.useState("");
  const [lat, setLat] = React.useState("");
  const [lon, setLon] = React.useState("");

  const extractGpsFromExif = (exif: any): { lat?: number; lon?: number } => {
    if (!exif) return {};
    // Common cases across platforms
    const gpsObj = exif["{GPS}"];
    const lat1 = typeof exif.GPSLatitude === "number" ? exif.GPSLatitude : gpsObj?.Latitude;
    const lon1 = typeof exif.GPSLongitude === "number" ? exif.GPSLongitude : gpsObj?.Longitude;
    if (typeof lat1 === "number" && typeof lon1 === "number") {
      return { lat: lat1, lon: lon1 };
    }
    return {};
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "We need camera permission to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
      exif: true,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    setImageUri(asset.uri ?? "");
    const { lat: exLat, lon: exLon } = extractGpsFromExif(asset.exif);
    if (typeof exLat === "number" && typeof exLon === "number") {
      setLat(String(exLat));
      setLon(String(exLon));
      Alert.alert("Location detected", "GPS coordinates extracted from image EXIF.");
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "We need photo library permission to pick an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      exif: true,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    setImageUri(asset.uri ?? "");
    const { lat: exLat, lon: exLon } = extractGpsFromExif(asset.exif);
    if (typeof exLat === "number" && typeof exLon === "number") {
      setLat(String(exLat));
      setLon(String(exLon));
      Alert.alert("Location detected", "GPS coordinates extracted from image EXIF.");
    } else {
      // No EXIF GPS
    }
  };

  const useCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "We need location permission to fill your current coordinates.");
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    setLat(String(pos.coords.latitude));
    setLon(String(pos.coords.longitude));
  };

  const onSubmit = async () => {
    const latNum = Number(lat);
    const lonNum = Number(lon);
    if (!title || !imageUri || Number.isNaN(latNum) || Number.isNaN(lonNum)) {
      Alert.alert("Incomplete", "Please enter title, image URL, and valid coordinates.");
      return;
    }
    const res = await createPost({
      title,
      description: description || undefined,
      imageUri,
      location: { lat: latNum, lon: lonNum },
    } as any);
    if (res.ok) {
      router.push(`/post/${res.id}` as any);
    } else {
      Alert.alert("Cannot create post", res.reason);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Create a new place</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <TouchableOpacity style={styles.secondaryButton} onPress={pickImage}>
          <Text style={styles.secondaryButtonText}>Pick Image</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={takePhoto}>
          <Text style={styles.secondaryButtonText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={useCurrentLocation}>
          <Text style={styles.secondaryButtonText}>Use Current Location</Text>
        </TouchableOpacity>
      </View>
      {imageUri ? (
        <View style={{ marginBottom: 10 }}>
          <Text style={{ color: "#aaa", marginBottom: 6 }}>Preview</Text>
          <View style={{ borderRadius: 10, overflow: "hidden", borderColor: "#222", borderWidth: 1 }}>
            <Image source={{ uri: imageUri }} style={{ width: "100%", height: 160, backgroundColor: "#222" }} />
          </View>
        </View>
      ) : null}
      <TextInput placeholder="Title" placeholderTextColor="#777" style={styles.input} value={title} onChangeText={setTitle} />
      <TextInput placeholder="Description (optional)" placeholderTextColor="#777" style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline numberOfLines={4} />
      <TextInput placeholder="Image URL (or use Pick Image)" placeholderTextColor="#777" style={styles.input} value={imageUri} onChangeText={setImageUri} />
      <View style={styles.row}>
        <TextInput placeholder="Latitude" placeholderTextColor="#777" style={[styles.input, styles.half]} keyboardType="decimal-pad" value={lat} onChangeText={setLat} />
        <TextInput placeholder="Longitude" placeholderTextColor="#777" style={[styles.input, styles.half, { marginLeft: 8 }]} keyboardType="decimal-pad" value={lon} onChangeText={setLon} />
      </View>
      <TouchableOpacity style={styles.button} onPress={onSubmit}>
        <Text style={styles.buttonText}>Publish</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>
        Tip: In a later version, we'll auto-extract the location from the image's EXIF or use current GPS.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { padding: 16 },
  heading: { color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 12 },
  input: { backgroundColor: "#111", color: "#fff", borderColor: "#222", borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  multiline: { textAlignVertical: "top" },
  row: { flexDirection: "row" },
  half: { flex: 1 },
  button: { backgroundColor: "#fff", paddingVertical: 12, borderRadius: 10, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#000", fontWeight: "600" },
  hint: { color: "#888", marginTop: 12, fontSize: 12 },
  secondaryButton: { backgroundColor: "#222", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderColor: "#333", borderWidth: 1 },
  secondaryButtonText: { color: "#fff" },
});

