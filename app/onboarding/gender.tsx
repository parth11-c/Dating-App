import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useOnboarding } from "./_context";

const PRONOUNS = [
  { key: "she/her", label: "She/Her" },
  { key: "he/him", label: "He/Him" },
  { key: "they/them", label: "They/Them" },
  { key: "other", label: "Other" },
] as const;

const GENDERS = [
  { key: "female", label: "Woman" },
  { key: "male", label: "Man" },
  { key: "non-binary", label: "Non-binary" },
  { key: "prefer-not-say", label: "Prefer not to say" },
] as const;

type KeyOf<T extends readonly { key: string }[]> = T[number]["key"];

export default function OnboardingGender() {
  const { update } = useOnboarding();
  const [pronoun, setPronoun] = React.useState<KeyOf<typeof PRONOUNS> | null>(null);
  const [gender, setGender] = React.useState<KeyOf<typeof GENDERS> | null>(null);
  const [saving, setSaving] = React.useState(false);

  const onNext = async () => {
    if (!pronoun || !gender) {
      Alert.alert("Incomplete", "Please select both pronoun and gender to continue.");
      return;
    }
    setSaving(true);
    update({ pronoun, gender });
    setSaving(false);
    router.push("/onboarding/preference" as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent}>
        <Text style={styles.title}>Pronoun & Gender</Text>
        <Text style={styles.subtitle}>Select the pronoun you use and your gender.</Text>

        <View style={{ height: 16 }} />
        <Text style={styles.section}>Your pronoun</Text>
        {PRONOUNS.map((p) => (
          <TouchableOpacity key={p.key} style={[styles.option, pronoun === p.key && styles.optionActive]} onPress={() => setPronoun(p.key)} disabled={saving}>
            <Text style={[styles.optionText, pronoun === p.key && styles.optionTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}

        <View style={{ height: 20 }} />
        <Text style={styles.section}>Your gender</Text>
        {GENDERS.map((g) => (
          <TouchableOpacity key={g.key} style={[styles.option, gender === g.key && styles.optionActive]} onPress={() => setGender(g.key)} disabled={saving}>
            <Text style={[styles.optionText, gender === g.key && styles.optionTextActive]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.cta, (!pronoun || !gender) && styles.ctaDisabled]} onPress={onNext} disabled={!pronoun || !gender || saving}>
          <Text style={styles.ctaText}>{saving ? "Saving..." : "Next"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF5F8" },
  bodyScroll: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 32 },
  title: { color: "#1a1a1a", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#6b5b61", marginTop: 6 },
  section: { color: "#6b5b61", fontWeight: "800", marginBottom: 8, marginTop: 6 },
  option: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: "#f0cfd8", marginBottom: 12, backgroundColor: "#ffffff" },
  optionActive: { borderColor: "#ff5b80", backgroundColor: "#ffe9f0" },
  optionText: { color: "#6b5b61", fontSize: 16, fontWeight: "700" },
  optionTextActive: { color: "#1a1a1a" },
  footer: { padding: 16 },
  cta: { backgroundColor: "#ff5b80", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
});
