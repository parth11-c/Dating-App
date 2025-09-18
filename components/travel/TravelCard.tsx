import React from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity } from 'react-native';
import { responsiveValue, shadows } from '@/lib/responsive';

export interface TravelItem {
  id: string;
  title: string;
  location: string;
  image: any; // require(...) for local images or { uri }
  price?: string;
  rating?: number;
  category?: string;
}

interface Props {
  item: TravelItem;
  onPress?: (item: TravelItem) => void;
}

export default function TravelCard({ item, onPress }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => onPress?.(item)}>
      <ImageBackground source={item.image} imageStyle={styles.image} style={styles.card}>
        <View style={styles.overlay} />
        <View style={styles.topRow}>
          {item.price ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.price}</Text>
            </View>
          ) : null}
          {typeof item.rating === 'number' ? (
            <View style={[styles.badge, styles.badgeRight]}>
              <Text style={styles.badgeText}>★ {item.rating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.bottom}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.location}</Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    height: responsiveValue(180, 220),
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: responsiveValue(14, 16),
    ...shadows.medium,
  },
  image: { borderRadius: 16 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  topRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeRight: {},
  badgeText: { color: '#000', fontWeight: '700' },
  bottom: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
  },
  title: {
    color: '#fff',
    fontSize: responsiveValue(18, 22),
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: '#ddd',
    marginTop: 4,
    fontSize: responsiveValue(13, 15),
  },
});
