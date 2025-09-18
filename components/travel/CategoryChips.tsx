import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { responsiveValue } from '@/lib/responsive';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

export default function CategoryChips({ categories, selected, onSelect }: Props) {
  const colors = useThemeColors();
  const baseChip = {
    backgroundColor: colors.mode === 'dark' ? '#141414' : '#f3f3f3',
    borderColor: colors.mode === 'dark' ? '#1f1f1f' : '#e3e3e3',
  };
  const activeChip = {
    backgroundColor: colors.tint,
    borderColor: colors.tint,
  };
  const baseText = { color: colors.icon };
  const activeText = { color: colors.mode === 'dark' ? '#000' : '#fff', fontWeight: '700' as const };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {categories.map((cat) => {
        const active = selected === cat;
        return (
          <TouchableOpacity key={cat} onPress={() => onSelect(cat)}>
            <View style={[styles.chip, baseChip, active && activeChip]}>
              <Text style={[styles.chipText, baseText, active && activeText]}>{cat}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingVertical: 6, paddingHorizontal: 2 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: responsiveValue(14, 16),
    paddingVertical: responsiveValue(8, 10),
  },
  chipActive: { },
  chipText: { color: '#bbb', fontSize: responsiveValue(14, 16) },
  chipTextActive: { },
});
