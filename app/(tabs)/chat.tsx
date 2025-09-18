import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import SafeAreaWrapper from '@/components/SafeAreaWrapper';
import { fontSizes, responsiveValue } from '@/lib/responsive';

export default function ChatScreen() {
  return (
    <SafeAreaWrapper style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Your chats will appear here.</Text>
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
