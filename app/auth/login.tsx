import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import { fontSizes, buttonDimensions, shadows, responsiveValue } from '../../lib/responsive';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ email: false, password: false });

  const isEmailValid = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);
  const isPasswordValid = password.length >= 6;
  const isFormValid = isEmailValid && isPasswordValid;

  const onLogin = async () => {
    setError(null);
    if (!isFormValid) {
      setTouched({ email: true, password: true });
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaWrapper style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.logo}>ClgMart</Text>
        <Text style={styles.title}>Sign In</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          placeholder="Email"
          placeholderTextColor="#777"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
          }}
          onBlur={() => setTouched((s) => ({ ...s, email: true }))}
          style={styles.input}
        />
        {touched.email && !isEmailValid ? (
          <Text style={styles.hint}>Enter a valid email address</Text>
        ) : null}
        <TextInput
          placeholder="Password"
          placeholderTextColor="#777"
          secureTextEntry
          value={password}
          onChangeText={(t) => {
            setPassword(t);
          }}
          onBlur={() => setTouched((s) => ({ ...s, password: true }))}
          style={styles.input}
        />
        {touched.password && !isPasswordValid ? (
          <Text style={styles.hint}>Password must be at least 6 characters</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, (!isFormValid || loading) && styles.primaryButtonDisabled]}
          onPress={onLogin}
          disabled={loading || !isFormValid}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.primaryButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.loginPrompt}>
          New here?{' '}
          <Link href="/auth/signup" asChild>
            <Text style={styles.loginLink}>Create an account</Text>
          </Link>
        </Text>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: responsiveValue(20, 32) },
  content: { flex: 1, justifyContent: 'center' },
  logo: { fontSize: responsiveValue(fontSizes.display, 44), color: '#fff', fontWeight: '800', marginBottom: 12 },
  title: { fontSize: responsiveValue(fontSizes.xl, 24), color: '#ddd', marginBottom: 20 },
  error: { color: '#ff6b6b', marginBottom: 12 },
  input: {
    backgroundColor: '#141414',
    borderColor: '#1f1f1f',
    borderWidth: 1,
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  hint: { color: '#ffb4a2', marginTop: -6, marginBottom: 10, fontSize: responsiveValue(fontSizes.sm, 12) },
  primaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: buttonDimensions.height / 2,
    borderRadius: buttonDimensions.borderRadius,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
    ...shadows.medium,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#000', fontSize: responsiveValue(fontSizes.lg, 18), fontWeight: '600' },
  loginPrompt: { fontSize: responsiveValue(fontSizes.md, 16), color: '#888', textAlign: 'center', marginTop: 14 },
  loginLink: { color: '#fff', fontWeight: '600' },
});
