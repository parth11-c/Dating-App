import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useOnboarding } from "@/context/onboarding";
import { Ionicons } from "@expo/vector-icons";

const INTEREST_TOPICS = [
  // Lifestyle
  "Fitness", "Yoga", "Running", "Cycling", "Hiking", "Photography",
  // Food & Drink
  "Coffee", "Tea", "Baking", "Cooking", "Vegan", "BBQ",
  // Arts & Entertainment
  "Movies", "Series", "Bollywood", "Hollywood", "Anime", "Comics",
  // Music
  "Classical", "Rock", "Pop", "Hip-Hop", "EDM", "Indie",
  // Games
  "Cricket", "Football", "Badminton", "Chess", "Esports",
  // Learning
  "Reading", "Writing", "Poetry", "Self-growth", "Startups", "Tech",
  // Travel & Experiences
  "Road Trips", "Backpacking", "Beaches", "Mountains", "Camping",
  // Social
  "Volunteering", "Pet Lover", "Board Games", "Nightlife",
];

export default function OnboardingInterests() {
  const { draft, update } = useOnboarding();
  const [selected, setSelected] = React.useState<string[]>(draft.interests || []);

  const toggle = (label: string) => {
    setSelected((prev) => prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]);
  };

  const onNext = () => {
    update({ interests: selected });
    router.push("/onboarding/preference" as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}> 
        <Text style={styles.title}>Your interests</Text>
        <Text style={styles.subtitle}>Pick a few topics you vibe with. You can change these later.</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.chipsWrap}>
          {INTEREST_TOPICS.map((label) => (
            <Chip key={label} label={label} active={selected.includes(label)} onPress={() => toggle(label)} />
          ))}
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.cta, selected.length === 0 && styles.ctaSecondary]} onPress={onNext}>
          <Text style={[styles.ctaText, selected.length === 0 && styles.ctaTextSecondary]}>{selected.length === 0 ? "Skip for now" : "Next"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#9aa0a6", marginTop: 6 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { backgroundColor: '#0f0f10', borderColor: '#222', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  chipActive: { borderColor: '#fff', backgroundColor: '#141416' },
  chipText: { color: '#c7c7c7', fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  footer: { padding: 16 },
  cta: { backgroundColor: "#fff", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  ctaSecondary: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333' },
  ctaText: { color: "#000", fontSize: 16, fontWeight: "800" },
  ctaTextSecondary: { color: '#fff' },
});

function Chip({ label, active, onPress, disabled }: { label: string; active: boolean; onPress: () => void; disabled?: boolean }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const onIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, friction: 6 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  return (
    <Pressable style={{ borderRadius: 18 }} onPressIn={onIn} onPressOut={onOut} onPress={onPress} disabled={disabled}>
      <Animated.View style={[styles.chip, active && styles.chipActive, { transform: [{ scale }] }]}> 
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}
