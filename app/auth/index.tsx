import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { fontSizes, responsiveValue, buttonDimensions, shadows } from "../../lib/responsive";

export default function AuthIndex() {
  // Animated brand blobs
  const blobA = React.useRef(new Animated.Value(0)).current;
  const blobB = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blobA, { toValue: 1, duration: 6000, useNativeDriver: true }),
        Animated.timing(blobA, { toValue: 0, duration: 6000, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(blobB, { toValue: 1, duration: 7000, useNativeDriver: true }),
        Animated.timing(blobB, { toValue: 0, duration: 7000, useNativeDriver: true }),
      ])
    ).start();
  }, [blobA, blobB]);

  const blobATransform = {
    transform: [
      { translateX: blobA.interpolate({ inputRange: [0, 1], outputRange: [-25, 20] }) },
      { translateY: blobA.interpolate({ inputRange: [0, 1], outputRange: [-10, 16] }) },
      { scale: blobA.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) },
    ]
  } as const;
  const blobBTransform = {
    transform: [
      { translateX: blobB.interpolate({ inputRange: [0, 1], outputRange: [18, -22] }) },
      { translateY: blobB.interpolate({ inputRange: [0, 1], outputRange: [12, -12] }) },
      { scale: blobB.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) },
    ]
  } as const;
  return (
    <SafeAreaView style={styles.container}>
      {/* Decorative background */}
      <View pointerEvents="none" style={styles.bgWrap}>
        <Animated.View style={[styles.blob, styles.blobA, blobATransform]} />
        <Animated.View style={[styles.blob, styles.blobB, blobBTransform]} />
        <View style={[styles.ring, styles.ringA]} />
        <View style={[styles.ring, styles.ringB]} />
      </View>

      {/* Hero card */}
      <View style={styles.center}>
        <View style={styles.card}>
          <Text style={styles.logo}>ClgMart</Text>
          <Text style={styles.title}>Buy & Sell on Campus</Text>
          <Text style={styles.subtitle}>Discover great deals from students near you. Simple. Safe. Fast.</Text>

          <TouchableOpacity style={styles.cta} onPress={() => router.push("/auth/sign-in" as any)}>
            <Text style={styles.ctaText}>Get Started</Text>
          </TouchableOpacity>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn]} onPress={() => router.push("/auth/sign-in" as any)}>
              <Text style={styles.primaryBtnText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={() => router.push("/auth/sign-up" as any)}>
              <Text style={styles.secondaryBtnText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.features}>
            <Text style={styles.feature}>• Secure accounts</Text>
            <Text style={styles.feature}>• Student-only marketplace</Text>
            <Text style={styles.feature}>• Fast listing in minutes</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  bgWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  blob: { position: 'absolute', width: 240, height: 240, borderRadius: 120, opacity: 0.22 },
  blobA: { backgroundColor: '#2563eb', top: -60, left: -40, transform: [{ rotate: '15deg' }] },
  blobB: { backgroundColor: '#7c3aed', bottom: -80, right: -60, transform: [{ rotate: '-20deg' }] },
  ring: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: '#1f1f22', opacity: 0.6 },
  ringA: { top: 90, right: 24 },
  ringB: { bottom: 120, left: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: responsiveValue(20, 28) },
  card: { width: '100%', maxWidth: 460, backgroundColor: '#0f0f10', borderRadius: 18, borderWidth: 1, borderColor: '#1f1f22', paddingVertical: responsiveValue(22, 28), paddingHorizontal: responsiveValue(18, 24), ...shadows.medium, alignItems: 'center' },
  logo: { fontSize: responsiveValue(fontSizes.xl, 28), fontWeight: "800", color: "#fff", marginBottom: responsiveValue(6, 8), letterSpacing: -0.5 },
  title: { fontSize: responsiveValue(fontSizes.lg, 22), color: "#fff", fontWeight: "700", marginBottom: responsiveValue(6, 8), textAlign: 'center' },
  subtitle: { fontSize: responsiveValue(fontSizes.md, 14), color: "#9aa0a6", textAlign: "center", marginBottom: responsiveValue(14, 18) },
  cta: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 22, alignItems: 'center', width: '100%', marginBottom: responsiveValue(10, 14) },
  ctaText: { color: '#000', fontSize: responsiveValue(fontSizes.md, 16), fontWeight: '800' },
  actionsRow: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 4, marginBottom: responsiveValue(8, 10) },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  primaryBtn: { backgroundColor: '#121417', borderColor: '#1f2329' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#0a0a0a', borderColor: '#1f1f22' },
  secondaryBtnText: { color: '#9aa0a6', fontWeight: '700' },
  features: { width: '100%', marginTop: responsiveValue(10, 12) },
  feature: { color: '#9aa0a6', fontSize: responsiveValue(fontSizes.sm, 12), textAlign: 'center', marginVertical: 2 },
});

