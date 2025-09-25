import React from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useOnboarding } from "@/context/onboarding";

export default function OnboardingName() {
  const { draft, update } = useOnboarding();
  const [name, setName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const onNext = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("What's your name?", "Please enter your name to continue.");
      return;
    }
    setSaving(true);
    update({ name: trimmed, bio: bio.trim() || undefined });
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
            placeholderTextColor="#6b7280"
            value={name}
            onChangeText={setName}
            style={styles.input}
            autoCapitalize="words"
            maxLength={40}
            returnKeyType="done"
          />

          <View style={{ height: 16 }} />
          <Text style={styles.section}>About you (optional)</Text>
          <TextInput
            placeholder="Say something about yourself"
            placeholderTextColor="#6b7280"
            value={bio}
            onChangeText={setBio}
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={4}
            maxLength={280}
          />
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
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  body: { padding: 16, paddingBottom: 40 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#9aa0a6", marginTop: 6 },
  section: { color: "#c7c7c7", fontWeight: "800", marginBottom: 8, marginTop: 6 },
  input: { backgroundColor: "#0f0f10", borderColor: "#222", borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#fff" },
  textArea: { height: 120, textAlignVertical: 'top' },
  footer: { padding: 16 },
  cta: { backgroundColor: "#fff", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: "#000", fontSize: 16, fontWeight: "800" },
});
