import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import SafeAreaWrapper from '@/components/SafeAreaWrapper';
import TravelCard from '@/components/travel/TravelCard';
import { travelItems } from '@/data/travel';
import { fontSizes, responsiveValue, shadows, buttonDimensions } from '@/lib/responsive';

export default function TripsScreen() {
  const colors = useThemeColors();
  const [showUpcoming, setShowUpcoming] = useState(true);

  const upcoming = useMemo(() => travelItems.slice(0, 3), []);
  const past = useMemo(() => travelItems.slice(2), []);

  const data = showUpcoming ? upcoming : past;

  const baseToggle = { backgroundColor: colors.mode === 'dark' ? '#141414' : '#f3f3f3', borderColor: colors.mode === 'dark' ? '#1f1f1f' : '#e3e3e3' };
  const activeToggle = { backgroundColor: colors.text, borderColor: colors.text };
  const baseText = { color: colors.icon };
  const activeText = { color: colors.background };

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Your Trips</Text>
        <Text style={[styles.subtitle, { color: colors.icon }]}>{showUpcoming ? 'Upcoming journeys' : 'Past adventures'}</Text>
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity onPress={() => setShowUpcoming(true)} style={[styles.toggleBtn, baseToggle, showUpcoming && activeToggle]}>
          <Text style={[styles.toggleText, baseText, showUpcoming && activeText]}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowUpcoming(false)} style={[styles.toggleBtn, baseToggle, !showUpcoming && activeToggle]}>
          <Text style={[styles.toggleText, baseText, !showUpcoming && activeText]}>Past</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TravelCard item={item} />}
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
  toggleRow: { flexDirection: 'row', gap: 10, marginVertical: responsiveValue(12, 14) },
  toggleBtn: {
    flex: 1,
    backgroundColor: '#141414',
    borderColor: '#1f1f1f',
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: buttonDimensions.height / 3,
    ...shadows.medium,
  },
  toggleActive: { backgroundColor: '#fff', borderColor: '#fff' },
  toggleText: { color: '#bbb', fontWeight: '600' },
  toggleTextActive: { color: '#000' },
  list: { paddingTop: responsiveValue(6, 8), paddingBottom: 40 },
});
