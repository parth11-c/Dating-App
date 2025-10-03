import React from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useOnboarding } from "./_context";

export default function OnboardingName() {
  const { draft, update } = useOnboarding();
  const [name, setName] = React.useState("");
  const [religion, setReligion] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const onNext = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("What's your name?", "Please enter your name to continue.");
      return;
    }
    setSaving(true);
    update({ name: trimmed, religion: religion || undefined });
    setSaving(false);
    router.push("/onboarding/dob" as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Your name</Text>
          <Text style={styles.subtitle}>Tell others what to call you. You can change this later.</Text>

          <View style={{ height: 16 }} />
          <TextInput
            placeholder="Enter your name"
            placeholderTextColor="#6b5b61"
            value={name}
            onChangeText={setName}
            style={styles.input}
            autoCapitalize="words"
            maxLength={40}
            returnKeyType="done"
          />

          <View style={{ height: 16 }} />
          <Text style={styles.section}>Religion</Text>
          <View style={styles.chipsWrap}>
            {RELIGIONS.map((r) => (
              <TouchableOpacity key={r.key} style={[styles.chip, religion === r.key && styles.chipActive]} onPress={() => setReligion(r.key)}>
                <Text style={[styles.chipText, religion === r.key && styles.chipTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.cta, !name.trim() && styles.ctaDisabled]} onPress={onNext} disabled={!name.trim() || saving}>
            <Text style={styles.ctaText}>{saving ? "Saving..." : "Next"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF5F8" },
  body: { padding: 16, paddingBottom: 40 },
  title: { color: "#1a1a1a", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#6b5b61", marginTop: 6 },
  section: { color: "#6b5b61", fontWeight: "800", marginBottom: 8, marginTop: 6 },
  input: { backgroundColor: "#ffffff", borderColor: "#f0cfd8", borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#1a1a1a" },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { backgroundColor: '#ffffff', borderColor: '#f0cfd8', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 18 },
  chipActive: { borderColor: '#ff5b80', backgroundColor: '#ffe9f0' },
  chipText: { color: '#6b5b61', fontWeight: '700' },
  chipTextActive: { color: '#1a1a1a' },
  footer: { padding: 16 },
  cta: { backgroundColor: "#ff5b80", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
});

const RELIGIONS = [
  { key: 'hindu', label: 'Hindu' },
  { key: 'muslim', label: 'Muslim' },
  { key: 'christian', label: 'Christianity' },
  { key: 'sikh', label: 'Sikh' },
  { key: 'buddhist', label: 'Buddhist' },
  { key: 'jain', label: 'Jain' },
  { key: 'jewish', label: 'Jewish' },
  { key: 'spiritual', label: 'Spiritual' },
  { key: 'agnostic', label: 'Agnostic' },
  { key: 'atheist', label: 'Atheist' },
];
