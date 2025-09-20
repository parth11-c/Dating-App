import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { fontSizes, responsiveValue, buttonDimensions, shadows } from "../lib/responsive";

export default function Index() {
  // Animated brand blobs only
 


  return (
    <SafeAreaView style={styles.container}>
 

      {/* Hero card */}
      <View style={styles.center}>
        <View style={styles.card}>
          <Text style={styles.logo}>ClgMart</Text>
          <Text style={styles.title}>Buy & Sell on Campus</Text>
          <Text style={styles.subtitle}>Discover great deals from students near you. Simple. Safe. Fast.</Text>

          <TouchableOpacity style={styles.cta} onPress={() => router.replace("/auth/sign-in" as any)}>
            <Text style={styles.ctaText}>Get Started</Text>
          </TouchableOpacity>


        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  bgWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  blob: { position: 'absolute', width: 260, height: 260, borderRadius: 130, opacity: 0.25 },
  blobA: { backgroundColor: '#4da3ff', top: -70, left: -50, transform: [{ rotate: '15deg' }] },
  blobB: { backgroundColor: '#7f5cff', bottom: -90, right: -70, transform: [{ rotate: '-20deg' }] },
  ring: { position: 'absolute', width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: '#1f1f22', opacity: 0.6 },
  ringA: { top: 110, right: 24 },
  ringB: { bottom: 140, left: 16 },
  star: { position: 'absolute', backgroundColor: '#ffffff', borderRadius: 2, opacity: 0.8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: responsiveValue(20, 28) },
  card: { width: '100%', maxWidth: 320, backgroundColor: '#0f0f10', borderRadius: 18, borderWidth: 1, borderColor: '#1f1f22', paddingVertical: responsiveValue(22, 28), paddingHorizontal: responsiveValue(18, 24), ...shadows.medium, alignItems: 'center' },
  logo: { fontSize: responsiveValue(fontSizes.xl, 28), fontWeight: "800", color: "#fff", marginBottom: responsiveValue(6, 8), letterSpacing: -0.5 },
  title: { fontSize: responsiveValue(fontSizes.lg, 22), color: "#fff", fontWeight: "700", marginBottom: responsiveValue(6, 8), textAlign: 'center' },
  subtitle: { fontSize: responsiveValue(fontSizes.md, 14), color: "#9aa0a6", textAlign: "center", marginBottom: responsiveValue(14, 18) },
  cta: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 22, alignItems: 'center', width: '100%', marginBottom: responsiveValue(10, 14) },
  ctaText: { color: '#000', fontSize: responsiveValue(fontSizes.md, 16), fontWeight: '800' },
  features: { width: '100%', marginTop: responsiveValue(10, 12) },
  feature: { color: '#9aa0a6', fontSize: responsiveValue(fontSizes.sm, 12), textAlign: 'center', marginVertical: 2 },
});
