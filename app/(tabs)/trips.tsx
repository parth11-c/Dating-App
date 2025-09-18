import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import SafeAreaWrapper from '@/components/SafeAreaWrapper';
import TravelCard from '@/components/travel/TravelCard';
import { travelItems } from '@/data/travel';
import { fontSizes, responsiveValue, shadows, buttonDimensions } from '@/lib/responsive';

export default function TripsScreen() {
  const [showUpcoming, setShowUpcoming] = useState(true);

  const upcoming = useMemo(() => travelItems.slice(0, 3), []);
  const past = useMemo(() => travelItems.slice(2), []);

  const data = showUpcoming ? upcoming : past;

  return (
    <SafeAreaWrapper style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Trips</Text>
        <Text style={styles.subtitle}>{showUpcoming ? 'Upcoming journeys' : 'Past adventures'}</Text>
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity onPress={() => setShowUpcoming(true)} style={[styles.toggleBtn, showUpcoming && styles.toggleActive]}>
          <Text style={[styles.toggleText, showUpcoming && styles.toggleTextActive]}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowUpcoming(false)} style={[styles.toggleBtn, !showUpcoming && styles.toggleActive]}>
          <Text style={[styles.toggleText, !showUpcoming && styles.toggleTextActive]}>Past</Text>
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
