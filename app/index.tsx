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
          const complete = !!(profile && profile.name && profile.gender && profile.pronoun && profile.date_of_birth && profile.preferred_gender && photos.length === 4);
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
        <ActivityIndicator color="#ff5b80" size="large" />
        <Text style={{ color: '#6b5b61', marginTop: 12 }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Hero card */}
      <View style={styles.center}>
        <View style={styles.card}>
          <Text style={styles.logo}>MatchUp</Text>
          <Text style={styles.title}>Meet. Connect. Match.</Text>
          <Text style={styles.subtitle}>A clean, friendly way to find your match.</Text>

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
    backgroundColor: "#FFF5F8",
  },
  bgWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  star: { position: 'absolute', backgroundColor: '#ffffff', borderRadius: 2, opacity: 0.8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: responsiveValue(20, 28) },
  card: { width: '100%', maxWidth: 320, backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: '#f0cfd8', paddingVertical: responsiveValue(22, 28), paddingHorizontal: responsiveValue(18, 24), ...shadows.medium, alignItems: 'center' },
  logo: { fontSize: responsiveValue(fontSizes.xl, 28), fontWeight: "800", color: "#ff5b80", marginBottom: responsiveValue(6, 8), letterSpacing: -0.5 },
  title: { fontSize: responsiveValue(fontSizes.lg, 22), color: "#1a1a1a", fontWeight: "700", marginBottom: responsiveValue(6, 8), textAlign: 'center' },
  subtitle: { fontSize: responsiveValue(fontSizes.md, 14), color: "#6b5b61", textAlign: "center", marginBottom: responsiveValue(14, 18) },
  cta: { backgroundColor: '#ff5b80', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 22, alignItems: 'center', width: '100%', marginBottom: responsiveValue(10, 14) },
  ctaText: { color: '#fff', fontSize: responsiveValue(fontSizes.md, 16), fontWeight: '800' },
  features: { width: '100%', marginTop: responsiveValue(10, 12) },
  feature: { color: '#6b5b61', fontSize: responsiveValue(fontSizes.sm, 12), textAlign: 'center', marginVertical: 2 },
});
