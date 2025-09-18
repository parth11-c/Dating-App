import React from 'react';
import { Switch } from 'react-native';
import { useAppTheme } from '@/theme/ThemeContext';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function ThemeToggle() {
  const { effective, setMode } = useAppTheme();
  const colors = useThemeColors();
  const isDark = effective === 'dark';

  return (
    <Switch
      accessibilityLabel="Toggle dark mode"
      value={isDark}
      onValueChange={(val) => setMode(val ? 'dark' : 'light')}
      trackColor={{ false: colors.icon + '33', true: colors.tint + '66' }}
      thumbColor={isDark ? colors.text : '#f4f3f4'}
    />
  );
}
