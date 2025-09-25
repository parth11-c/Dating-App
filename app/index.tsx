import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { fontSizes, responsiveValue, buttonDimensions, shadows } from "../lib/responsive";
import { supabase } from "@/lib/supabase";

export default function Index() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          const uid = session.user.id;
          const [{ data: p }, { data: ph }] = await Promise.all([
            supabase.from('profiles').select('id, name, gender, pronoun, preferred_gender, date_of_birth').eq('id', uid).maybeSingle(),
            supabase.from('photos').select('id').eq('user_id', uid)
          ]);
          const profile = p as any;
          const photos = (ph as any[]) || [];
          const complete = !!(profile && profile.name && profile.gender && profile.pronoun && profile.date_of_birth && profile.preferred_gender && photos.length === 6);
          // If complete, go to tabs/home; otherwise always start onboarding at Name
          router.replace((complete ? '/(tabs)/home' : '/onboarding/name') as any);
        } else {
          setChecking(false);
        }
      } catch (e) {
        setChecking(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (checking) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={{ color: '#9aa0a6', marginTop: 12 }}>Loading...</Text>
      </SafeAreaView>
    );
  }

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
