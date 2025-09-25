import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

export default function PostDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.title}>Post</Text>
        <Text style={styles.subtitle}>This is a placeholder for post ID: {String(id)}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  body: { flex: 1, padding: 16 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#9aa0a6", marginTop: 6 },
});
