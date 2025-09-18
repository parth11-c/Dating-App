import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeContext';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function ThemeToggle() {
  const { effective, toggle } = useAppTheme();
  const colors = useThemeColors();
  const isDark = effective === 'dark';

  return (
    <TouchableOpacity onPress={toggle} accessibilityLabel="Toggle theme" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <View style={[styles.badge, { backgroundColor: colors.mode === 'dark' ? '#1f1f1f' : '#eaeaea', borderColor: colors.mode === 'dark' ? '#2a2a2a' : '#d6d6d6' }]}>
        <Text style={[styles.text, { color: colors.text }]}>{isDark ? '🌙' : '☀️'}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 16 },
});
