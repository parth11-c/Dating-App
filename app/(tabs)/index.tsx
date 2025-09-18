import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import SafeAreaWrapper from '@/components/SafeAreaWrapper';
import SearchBar from '@/components/travel/SearchBar';
import CategoryChips from '@/components/travel/CategoryChips';
import TravelCard from '@/components/travel/TravelCard';
import { travelCategories, travelItems } from '@/data/travel';
import { fontSizes, responsiveValue } from '@/lib/responsive';

export default function HomeScreen() {
  const colors = useThemeColors();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return travelItems.filter((it) => {
      const matchesCat = category === 'All' || it.category === category;
      const matchesQuery = !q || `${it.title} ${it.location}`.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [query, category]);

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: colors.background }] }>
      {/* Decorative background */}
      <View style={[styles.blob, styles.blobTopRight]} />
      <View style={[styles.blob, styles.blobBottomLeft]} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TravelCard item={item} />}
        ListHeaderComponent={
          <View>
            <View style={styles.header}> 
              <Text style={[styles.title, { color: colors.text }]}>Discover</Text>
              <Text style={[styles.subtitle, { color: colors.icon }]}>Find your next unforgettable journey</Text>
            </View>
            <View style={styles.searchRow}>
              <SearchBar value={query} onChange={setQuery} />
            </View>
            <CategoryChips
              categories={travelCategories}
              selected={category}
              onSelect={setCategory}
            />
          </View>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', padding: responsiveValue(16, 22) },
  header: { marginBottom: responsiveValue(12, 16) },
  title: { color: '#fff', fontSize: responsiveValue(fontSizes.xl, 26), fontWeight: '800' },
  subtitle: { color: '#aaa', marginTop: 4 },
  searchRow: { marginVertical: responsiveValue(10, 12) },
  list: { paddingTop: responsiveValue(6, 8), paddingBottom: 64 },
  blob: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.12,
  },
  blobTopRight: { backgroundColor: '#6ee7b7', top: -30, right: -30 },
  blobBottomLeft: { backgroundColor: '#60a5fa', bottom: -50, left: -50 },
});
