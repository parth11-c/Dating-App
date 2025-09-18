import React from 'react';
import { SafeAreaView, View, StyleSheet, ViewStyle, Platform, StatusBar } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export default function SafeAreaWrapper({ children, style }: Props) {
  const colors = useThemeColors();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }] }>
      <View style={[styles.container, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    // SafeAreaView doesn't apply insets on Android; add top padding manually
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0,
  },
  container: {
    flex: 1,
  },
});
