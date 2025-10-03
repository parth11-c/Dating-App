import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useOnboarding } from "./_context";

const OPTIONS = [
  { key: "female", label: "Women" },
  { key: "male", label: "Men" },
  { key: "everyone", label: "Everyone" },
] as const;

type PrefKey = typeof OPTIONS[number]["key"];

export default function OnboardingPreference() {
  const { update } = useOnboarding();
  const [value, setValue] = React.useState<PrefKey | null>(null);
  const [saving, setSaving] = React.useState(false);

  const onNext = async () => {
    if (!value) {
      Alert.alert("Select a preference", "Please choose who you want to see.");
      return;
    }
    setSaving(true);
    update({ preferred_gender: value });
    setSaving(false);
    router.push("/onboarding/photos" as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.title}>Who do you want to see?</Text>
        <Text style={styles.subtitle}>Choose the type of profiles you want to see on the app.</Text>
        <View style={{ height: 12 }} />
        {OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.option, value === opt.key && styles.optionActive]}
            onPress={() => setValue(opt.key)}
            disabled={saving}
          >
            <Text style={[styles.optionText, value === opt.key && styles.optionTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.cta, !value && styles.ctaDisabled]} onPress={onNext} disabled={!value || saving}>
          <Text style={styles.ctaText}>{saving ? "Saving..." : "Next"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF5F8" },
  body: { flex: 1, padding: 16 },
  title: { color: "#1a1a1a", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#6b5b61", marginTop: 6 },
  option: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: "#f0cfd8", marginBottom: 12, backgroundColor: "#ffffff" },
  optionActive: { borderColor: "#ff5b80", backgroundColor: "#ffe9f0" },
  optionText: { color: "#6b5b61", fontSize: 16, fontWeight: "700" },
  optionTextActive: { color: "#1a1a1a" },
  footer: { padding: 16 },
  cta: { backgroundColor: "#ff5b80", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
});
