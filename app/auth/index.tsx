import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { fontSizes, responsiveValue, buttonDimensions, shadows } from "../../lib/responsive";

export default function AuthIndex() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.logo}>ClgMart</Text>
        <Text style={styles.subtitle}>Sign in or create an account</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push("/auth/sign-in" as any)}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => router.push("/auth/sign-up" as any)}>
          <Text style={styles.secondaryButtonText}>Sign Up</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: responsiveValue(24, 32) },
  logo: { fontSize: responsiveValue(fontSizes.xl, 24), fontWeight: "700", color: "#fff", marginBottom: responsiveValue(12, 16) },
  subtitle: { fontSize: responsiveValue(fontSizes.md, 16), color: "#888", marginBottom: responsiveValue(16, 20) },
  button: { backgroundColor: "#fff", borderRadius: buttonDimensions.borderRadius, paddingVertical: buttonDimensions.height / 2, paddingHorizontal: 16, alignItems: "center", width: 260, ...shadows.medium, marginTop: 10 },
  buttonText: { color: "#000", fontSize: responsiveValue(fontSizes.md, 16), fontWeight: "600" },
  secondaryButton: { backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#333" },
  secondaryButtonText: { color: "#fff", fontSize: responsiveValue(fontSizes.md, 16), fontWeight: "600" },
  back: { alignItems: "center", paddingVertical: responsiveValue(10, 12) },
  backText: { color: "#888", fontSize: responsiveValue(fontSizes.sm, 12) },
});
