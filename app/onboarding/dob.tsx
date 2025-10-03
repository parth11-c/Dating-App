import React from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useOnboarding } from "./_context";

function isValidDate(y: number, m: number, d: number) {
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function ageFrom(y: number, m: number, d: number) {
  const today = new Date();
  let age = today.getFullYear() - y;
  const hasHadBirthday = (today.getMonth() + 1 > m) || ((today.getMonth() + 1 === m) && today.getDate() >= d);
  if (!hasHadBirthday) age -= 1;
  return age;
}

export default function OnboardingDob() {
  const { update } = useOnboarding();
  const [day, setDay] = React.useState("");
  const [month, setMonth] = React.useState("");
  const [year, setYear] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const onNext = async () => {
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (!(d && m && y) || !isValidDate(y, m, d)) {
      Alert.alert("Invalid date", "Please enter a valid date of birth.");
      return;
    }
    const age = ageFrom(y, m, d);
    if (age < 18) {
      Alert.alert("Age restriction", "You must be at least 18 years old to use this app.");
      return;
    }
    setSaving(true);
    const iso = new Date(y, m - 1, d).toISOString().slice(0, 10);
    update({ date_of_birth: iso });
    setSaving(false);
    router.push("/onboarding/gender" as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Your birthday</Text>
          <Text style={styles.subtitle}>Enter your date of birth. This won’t be shown publicly.</Text>
          <View style={{ height: 16 }} />
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }] }>
              <Text style={styles.label}>Day</Text>
              <TextInput
                value={day}
                onChangeText={(t) => setDay(t.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                placeholder="DD"
                placeholderTextColor="#6b5b61"
                style={styles.input}
                maxLength={2}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.field, { flex: 1 }] }>
              <Text style={styles.label}>Month</Text>
              <TextInput
                value={month}
                onChangeText={(t) => setMonth(t.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                placeholder="MM"
                placeholderTextColor="#6b5b61"
                style={styles.input}
                maxLength={2}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.field, { flex: 2 }] }>
              <Text style={styles.label}>Year</Text>
              <TextInput
                value={year}
                onChangeText={(t) => setYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
                keyboardType="number-pad"
                placeholder="YYYY"
                placeholderTextColor="#6b5b61"
                style={styles.input}
                maxLength={4}
              />
            </View>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cta} onPress={onNext} disabled={saving}>
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
  row: { flexDirection: 'row' },
  field: {},
  label: { color: '#6b5b61', marginBottom: 8, fontWeight: '700' },
  input: { backgroundColor: "#ffffff", borderColor: "#f0cfd8", borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#1a1a1a" },
  footer: { padding: 16 },
  cta: { backgroundColor: "#ff5b80", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  ctaText: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
});
