import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import { fontSizes, buttonDimensions, shadows, responsiveValue } from '../../lib/responsive';
import { supabase } from '../../lib/supabase';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSignup = async () => {
    setError(null);
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      // If email confirmation is enabled, a session may be null until confirmation
      if (data.session) {
        router.replace('/(tabs)');
      } else {
        // fallback to login or show message
        router.replace('/auth/login');
      }
    }
  };

  return (
    <SafeAreaWrapper style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.logo}>ClgMart</Text>
        <Text style={styles.title}>Create Account</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          placeholder="Email"
          placeholderTextColor="#777"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#777"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        <TouchableOpacity style={styles.primaryButton} onPress={onSignup} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.primaryButtonText}>Create account</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.loginPrompt}>
          Already have an account?{' '}
          <Link href="/auth/login" asChild>
            <Text style={styles.loginLink}>Sign In</Text>
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
  primaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: buttonDimensions.height / 2,
    borderRadius: buttonDimensions.borderRadius,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
    ...shadows.medium,
  },
  primaryButtonText: { color: '#000', fontSize: responsiveValue(fontSizes.lg, 18), fontWeight: '600' },
  loginPrompt: { fontSize: responsiveValue(fontSizes.md, 16), color: '#888', textAlign: 'center', marginTop: 14 },
  loginLink: { color: '#fff', fontWeight: '600' },
});
