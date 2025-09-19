import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { fontSizes, responsiveValue, buttonDimensions, shadows } from "../../lib/responsive";
import { useStore } from "@/store";

export default function SignInScreen() {
  const { signIn } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (value: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value);

  const handleSignIn = async () => {
    if (!email || !password) return Alert.alert("Error", "Please fill in all required fields");
    if (!validateEmail(email)) return Alert.alert("Error", "Please enter a valid email address");
    if (password.length < 6) return Alert.alert("Error", "Password must be at least 6 characters long");

    try {
      setLoading(true);
      const res = await signIn(email, password);
      setLoading(false);
      if (!res.ok) return Alert.alert("Sign in failed", res.reason);
      router.replace("/(tabs)/home" as any);
    } catch (e: any) {
      setLoading(false);
      Alert.alert("Error", e?.message ?? "Something went wrong");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.logo}>ClgMart</Text>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputBlock}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputBlock}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((s) => !s)}>
                  <Text style={styles.eyeIcon}>{showPassword ? "👁️" : "👁️‍🗨️"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignIn} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.replace("/auth/sign-up" as any)}>
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  kav: { flex: 1, paddingHorizontal: responsiveValue(24, 32), paddingVertical: responsiveValue(20, 40) },
  scroll: { paddingBottom: responsiveValue(12, 20) },
  header: { alignItems: "center", marginBottom: responsiveValue(32, 48) },
  logo: { fontSize: responsiveValue(fontSizes.xl, 24), fontWeight: "700", color: "#fff", marginBottom: responsiveValue(16, 24), letterSpacing: -1 },
  title: { fontSize: responsiveValue(fontSizes.lg, 20), color: "#fff", fontWeight: "600", marginBottom: responsiveValue(6, 8) },
  subtitle: { fontSize: responsiveValue(fontSizes.md, 16), color: "#888", textAlign: "center" },
  form: { marginBottom: responsiveValue(24, 32) },
  inputBlock: { marginBottom: responsiveValue(16, 20) },
  label: { fontSize: responsiveValue(fontSizes.sm, 12), color: "#ccc", fontWeight: "500", marginBottom: responsiveValue(6, 8) },
  input: { backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#333", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: "#fff", fontSize: responsiveValue(fontSizes.md, 14), ...shadows.small },
  passwordRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#333", borderRadius: 12, ...shadows.small },
  passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, color: "#fff", fontSize: responsiveValue(fontSizes.md, 14) },
  eyeButton: { paddingHorizontal: responsiveValue(12, 16), paddingVertical: 12 },
  eyeIcon: { fontSize: responsiveValue(16, 18), color: "#ddd" },
  button: { backgroundColor: "#fff", borderRadius: buttonDimensions.borderRadius, paddingVertical: buttonDimensions.height / 2, alignItems: "center", ...shadows.medium },
  buttonDisabled: { backgroundColor: "#333" },
  buttonText: { color: "#000", fontSize: responsiveValue(fontSizes.md, 16), fontWeight: "600" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: responsiveValue(24, 32) },
  footerText: { color: "#888", fontSize: responsiveValue(fontSizes.sm, 12) },
  linkText: { color: "#fff", fontSize: responsiveValue(fontSizes.sm, 12), fontWeight: "600", marginLeft: responsiveValue(2, 4) },
  back: { alignItems: "center", paddingVertical: responsiveValue(6, 8) },
  backText: { color: "#888", fontSize: responsiveValue(fontSizes.sm, 12) },
});
