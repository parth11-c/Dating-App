import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { responsiveValue } from '@/lib/responsive';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = 'Search destinations, experiences...' }: Props) {
  const colors = useThemeColors();
  return (
    <View style={[styles.wrapper, { backgroundColor: colors.mode === 'dark' ? '#141414' : '#f3f3f3', borderColor: colors.mode === 'dark' ? '#1f1f1f' : '#e3e3e3' }]}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.icon}
        style={[styles.input, { color: colors.text }]}
        returnKeyType="search"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#141414',
    borderColor: '#1f1f1f',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: responsiveValue(10, 12),
  },
  input: { color: '#fff', fontSize: responsiveValue(16, 18) },
});
