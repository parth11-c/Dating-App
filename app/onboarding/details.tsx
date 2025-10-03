import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function OnboardingDetails() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.title}>Personal details</Text>
        <Text style={styles.subtitle}>This is a placeholder screen. Implement personal details form here.</Text>
      </View>
      <View style={styles.footer}>
        <Button title="Next" color="#ff5b80" onPress={() => router.push("/onboarding/photos" as any)} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF5F8" },
  body: { flex: 1, padding: 16, gap: 8 },
  title: { color: "#1a1a1a", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#6b5b61" },
  footer: { padding: 16 },
});
