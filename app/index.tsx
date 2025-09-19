import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { fontSizes, responsiveValue, buttonDimensions, shadows } from "../lib/responsive";

export default function Index() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.logo}>ClgMart</Text>
        <Text style={styles.subtitle}>Your college marketplace</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace("/auth/sign-in" as any)}> 
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: responsiveValue(24, 32),
  },
  logo: {
    fontSize: responsiveValue(fontSizes.xl, 24),
    color: "#ffffff",
    fontWeight: "700",
    marginBottom: responsiveValue(8, 12),
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: responsiveValue(fontSizes.md, 16),
    color: "#888888",
    marginBottom: responsiveValue(20, 28),
  },
  button: {
    backgroundColor: "#ffffff",
    borderRadius: buttonDimensions.borderRadius,
    paddingVertical: buttonDimensions.height / 2,
    paddingHorizontal: buttonDimensions.paddingHorizontal,
    ...shadows.medium,
  },
  buttonText: {
    color: "#000000",
    fontSize: responsiveValue(fontSizes.md, 16),
    fontWeight: "600",
  },
});
