import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { fontSizes, responsiveValue, buttonDimensions, shadows } from "../../lib/responsive";
import { useStore } from "@/store";
import { supabase } from "@/lib/supabase";

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
      if (!res.ok) {
        setLoading(false);
        return Alert.alert("Sign in failed", res.reason);
      }
      setLoading(false);
      // Always send user to Profile edit first
      router.replace('/(tabs)/profile?edit=1' as any);
    } catch (e: any) {
      setLoading(false);
      Alert.alert("Error", e?.message ?? "Something went wrong");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.centerWrap}>
            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={[styles.logo, { color: "#ff5b80" }]}>MatchUp</Text>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to your account</Text>
              </View>

              <View style={styles.form}>
                <View style={styles.inputBlock}>
                  <TextInput
                    style={[styles.input, { backgroundColor: "#f7f7f7" }]}
                    placeholder="Email"
                    placeholderTextColor="#9b7f89"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputBlock}>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.passwordInput, { backgroundColor: "#f7f7f7" }]}
                      placeholder="Password"
                      placeholderTextColor="#9b7f89"
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

                <TouchableOpacity style={[styles.button, { backgroundColor: "#ff5b80" }, loading && styles.buttonDisabled]} onPress={handleSignIn} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
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
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF5F8" },
  kav: { flex: 1, paddingHorizontal: responsiveValue(16, 24), paddingVertical: responsiveValue(10, 20) },
  scroll: { flexGrow: 1 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: responsiveValue(20, 40) },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#f0cfd8', padding: responsiveValue(18, 24), ...shadows.medium },
  header: { alignItems: "center", marginBottom: responsiveValue(18, 24) },
  logo: { fontSize: responsiveValue(fontSizes.xl, 26), fontWeight: "800", color: "#ff5b80", marginBottom: responsiveValue(6, 10), letterSpacing: -0.5 },
  title: { fontSize: responsiveValue(fontSizes.lg, 22), color: "#1a1a1a", fontWeight: "700", marginBottom: responsiveValue(4, 6) },
  subtitle: { fontSize: responsiveValue(fontSizes.md, 14), color: "#6b5b61", textAlign: "center" },
  form: { marginBottom: responsiveValue(10, 16) },
  inputBlock: { marginBottom: responsiveValue(12, 16) },
  label: { fontSize: responsiveValue(fontSizes.sm, 12), color: "#6b5b61", fontWeight: "600", marginBottom: responsiveValue(6, 8) },
  input: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#f0cfd8", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#1a1a1a", fontSize: responsiveValue(fontSizes.md, 15) },
  passwordRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#f0cfd8", borderRadius: 12 },
  passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, color: "#1a1a1a", fontSize: responsiveValue(fontSizes.md, 15) },
  eyeButton: { paddingHorizontal: responsiveValue(12, 16), paddingVertical: 12 },
  eyeIcon: { fontSize: responsiveValue(16, 18), color: "#6b5b61" },
  button: { backgroundColor: "#ff5b80", borderRadius: 12, paddingVertical: 14, alignItems: "center", width: '100%' },
  buttonDisabled: { backgroundColor: "#ffd0dc" },
  buttonText: { color: "#fff", fontSize: responsiveValue(fontSizes.md, 16), fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: responsiveValue(12, 16) },
  footerText: { color: "#6b5b61", fontSize: responsiveValue(fontSizes.sm, 12) },
  linkText: { color: "#ff5b80", fontSize: responsiveValue(fontSizes.sm, 12), fontWeight: "700", marginLeft: 4 },
});
