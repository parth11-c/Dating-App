import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import { fontSizes, buttonDimensions, shadows, responsiveValue } from '../lib/responsive';
import { useThemeColors } from '@/hooks/useThemeColors';
// Defer Supabase import to runtime to avoid SSR/bundler issues

export default function WelcomePage() {
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const colors = useThemeColors();

  useEffect(() => {
    let mounted = true;
    let unsub: (() => void) | undefined;
    (async () => {
      const { supabase } = await import('../lib/supabase');
      const { data } = await supabase.auth.getSession();
      if (mounted) {
        setLoggedIn(!!data.session);
        setChecking(false);
      }
      const { data: sub } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        if (mounted) setLoggedIn(!!session);
      });
      unsub = () => sub.subscription.unsubscribe();
    })();
    return () => {
      mounted = false;
      unsub?.();
    };
  }, []);

  if (!checking && loggedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.mode === 'dark' ? 'light' : 'dark'} />
      <View style={styles.background}>
        {/* Decorative background blobs */}
        <View style={[styles.blob, styles.blobTopRight]} />
        <View style={[styles.blob, styles.blobBottomLeft]} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={[styles.logo, { color: colors.text }]}>ClgMart</Text>
              <Text style={[styles.tagline, { color: colors.icon }]}>College Marketplace</Text>
            </View>

            <View style={styles.descriptionContainer}>
              <Text style={[styles.description, { color: colors.icon }] }>
                Buy, sell, and trade with your college community
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <Link href="/auth/signup" asChild>
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.text }]}>
                  <Text style={[styles.primaryButtonText, { color: colors.background }]}>Get Started</Text>
                </TouchableOpacity>
              </Link>

              <Text style={[styles.loginPrompt, { color: colors.icon }]}>
                Already have an account?{' '}
                <Link href="/auth/login" asChild>
                  <Text style={[styles.loginLink, { color: colors.text }]}>Sign In</Text>
                </Link>
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: responsiveValue(20, 40),
    paddingVertical: responsiveValue(20, 40),
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 600,
  },
  header: {
    alignItems: 'center',
    marginBottom: responsiveValue(40, 60),
  },
  logo: {
    fontSize: responsiveValue(fontSizes.display, 48),
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: responsiveValue(6, 8),
    letterSpacing: -1,
    textAlign: 'center',
  },
  tagline: {
    fontSize: responsiveValue(fontSizes.md, 18),
    color: '#888888',
    fontWeight: '400',
    textAlign: 'center',
  },
  descriptionContainer: {
    marginBottom: responsiveValue(40, 64),
    paddingHorizontal: responsiveValue(10, 20),
  },
  description: {
    fontSize: responsiveValue(fontSizes.lg, 20),
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: responsiveValue(24, 28),
    fontWeight: '300',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: responsiveValue(10, 20),
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: buttonDimensions.height / 2,
    paddingHorizontal: buttonDimensions.paddingHorizontal,
    borderRadius: buttonDimensions.borderRadius,
    alignItems: 'center',
    width: '100%',
    marginBottom: responsiveValue(20, 24),
    ...shadows.medium,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: responsiveValue(fontSizes.lg, 18),
    fontWeight: '600',
  },
  loginPrompt: {
    fontSize: responsiveValue(fontSizes.md, 16),
    color: '#888888',
    textAlign: 'center',
    lineHeight: responsiveValue(20, 22),
  },
  loginLink: {
    color: '#ffffff',
    fontWeight: '600',
  },
  blob: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.14,
  },
  blobTopRight: {
    backgroundColor: '#6ee7b7',
    top: -40,
    right: -40,
  },
  blobBottomLeft: {
    backgroundColor: '#60a5fa',
    bottom: -60,
    left: -60,
  },
});
