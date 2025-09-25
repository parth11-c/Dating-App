import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useOnboarding } from "@/context/onboarding";

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
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  body: { flex: 1, padding: 16 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#9aa0a6", marginTop: 6 },
  option: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: "#222", marginBottom: 12, backgroundColor: "#0f0f10" },
  optionActive: { borderColor: "#fff", backgroundColor: "#141416" },
  optionText: { color: "#c7c7c7", fontSize: 16, fontWeight: "700" },
  optionTextActive: { color: "#fff" },
  footer: { padding: 16 },
  cta: { backgroundColor: "#fff", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: "#000", fontSize: 16, fontWeight: "800" },
});
