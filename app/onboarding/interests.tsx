import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useOnboarding } from "./_context";
// strict light theme, no dynamic theming

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

  const theme = {
    bg: '#FFF5F8',
    text: '#1a1a1a',
    sub: '#6b5b61',
    chipBg: '#ffffff',
    chipBorder: '#f0cfd8',
    chipText: '#6b5b61',
    chipActiveBg: '#ffe9f0',
    chipActiveBorder: '#ff5b80',
    chipActiveText: '#1a1a1a',
    ctaBg: '#ff5b80',
    ctaText: '#ffffff',
    ctaSecondaryBg: '#ffffff',
    ctaSecondaryBorder: '#f0cfd8',
    ctaSecondaryText: '#1a1a1a',
  } as const;

  const toggle = (label: string) => {
    setSelected((prev) => prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]);
  };

  const onNext = () => {
    update({ interests: selected });
    router.push("/onboarding/details" as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}> 
        <Text style={[styles.title, { color: theme.text }]}>Your interests</Text>
        <Text style={[styles.subtitle, { color: theme.sub }]}>Pick a few topics you vibe with. You can change these later.</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.chipsWrap}>
          {INTEREST_TOPICS.map((label) => (
            <Chip key={label} label={label} active={selected.includes(label)} onPress={() => toggle(label)} theme={theme} />
          ))}
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.cta, 
            { backgroundColor: selected.length === 0 ? theme.ctaSecondaryBg : theme.ctaBg, borderColor: theme.ctaSecondaryBorder },
            selected.length === 0 && { borderWidth: 1 }
          ]} 
          onPress={onNext}
        >
          <Text style={[
            styles.ctaText, 
            { color: selected.length === 0 ? theme.ctaSecondaryText : theme.ctaText }
          ]}>
            {selected.length === 0 ? "Skip for now" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { marginTop: 6 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  chipActive: {},
  chipText: { fontWeight: '700' },
  chipTextActive: {},
  footer: { padding: 16 },
  cta: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  ctaSecondary: {},
  ctaText: { fontSize: 16, fontWeight: "800" },
  ctaTextSecondary: {},
});

function Chip({ label, active, onPress, disabled, theme }: { label: string; active: boolean; onPress: () => void; disabled?: boolean; theme: any }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const onIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, friction: 6 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  return (
    <Pressable style={{ borderRadius: 18 }} onPressIn={onIn} onPressOut={onOut} onPress={onPress} disabled={disabled}>
      <Animated.View style={[
        styles.chip, 
        { 
          backgroundColor: active ? theme.chipActiveBg : theme.chipBg,
          borderColor: active ? theme.chipActiveBorder : theme.chipBorder,
          transform: [{ scale }] 
        }
      ]}> 
        <Text style={[
          styles.chipText, 
          { color: active ? theme.chipActiveText : theme.chipText }
        ]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
