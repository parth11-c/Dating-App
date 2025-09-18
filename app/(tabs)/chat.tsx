import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import SafeAreaWrapper from '@/components/SafeAreaWrapper';
import { fontSizes, responsiveValue } from '@/lib/responsive';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function ChatScreen() {
  const colors = useThemeColors();
  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: colors.background }] }>
      <StatusBar style={colors.mode === 'dark' ? 'light' : 'dark'} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
        <Text style={[styles.subtitle, { color: colors.icon }]}>Your chats will appear here.</Text>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: responsiveValue(20, 32) },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: responsiveValue(fontSizes.xl, 26), fontWeight: '700' },
  subtitle: { color: '#aaa', marginTop: 8, fontSize: responsiveValue(fontSizes.md, 16) },
});
