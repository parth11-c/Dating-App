import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useLocalSearchParams } from 'expo-router';
import { checkInToPost, fetchPostById, fetchVisitsCount, PostWithPlace } from '@/lib/posts';
import * as Location from 'expo-location';

export default function PostDetails() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<PostWithPlace | null>(null);
  const [visits, setVisits] = useState<number>(0);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!id) return;
        const p = await fetchPostById(id);
        if (!mounted) return;
        setPost(p);
        const c = await fetchVisitsCount(id);
        if (!mounted) return;
        setVisits(c);
      } catch (e) {
        // no-op
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const onCheckIn = async () => {
    if (!post) return;
    setCheckingIn(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission denied');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await checkInToPost({ post, userLat: pos.coords.latitude, userLng: pos.coords.longitude, method: 'gps' });
      Alert.alert('Checked in', 'You have been added to the visitors list.');
      const c = await fetchVisitsCount(post.id);
      setVisits(c);
    } catch (e: any) {
      Alert.alert('Check-in failed', e.message ?? 'Unable to check in');
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Post not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={[styles.title, { color: colors.text }]}>{post.place.title ?? 'Place'}</Text>
      <Image source={{ uri: post.image_url }} style={styles.image} />
      {post.caption ? <Text style={{ color: colors.text }}>{post.caption}</Text> : null}
      <Text style={{ color: colors.icon }}>Visitors: {visits}</Text>
      <TouchableOpacity disabled={checkingIn} onPress={onCheckIn} style={[styles.button, { backgroundColor: colors.tint }]}>
        {checkingIn ? (
          <ActivityIndicator color={colors.mode === 'dark' ? '#000' : '#fff'} />
        ) : (
          <Text style={[styles.buttonText, { color: colors.mode === 'dark' ? '#000' : '#fff' }]}>Check in</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', aspectRatio: 4/3, borderRadius: 12, backgroundColor: '#00000022' },
  title: { fontSize: 22, fontWeight: '700' },
  button: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
