import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, TextInput, Switch, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SafeAreaWrapper from '@/components/SafeAreaWrapper';
import { fontSizes, responsiveValue, shadows, buttonDimensions } from '@/lib/responsive';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

const STORAGE_KEY = '@profile_prefs_v1';

type Prefs = {
  name: string;
  bio: string;
  notifications: boolean;
  newsletter: boolean;
  avatarUri?: string;
};

const defaultPrefs: Prefs = {
  name: 'Traveler',
  bio: 'Wanderlust at heart. Collecting memories across the world.',
  notifications: true,
  newsletter: false,
};

export default function ProfileScreen() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setPrefs({ ...defaultPrefs, ...JSON.parse(raw) });
      } catch {}
    })();
  }, []);

  const savePrefs = async (next: Prefs) => {
    setSaving(true);
    setPrefs(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } finally {
      setSaving(false);
    }
  };

  const onSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
    router.replace('/');
  };

  return (
    <SafeAreaWrapper style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            {prefs.avatarUri ? (
              <Image source={{ uri: prefs.avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>{prefs.name?.[0] ?? 'T'}</Text>
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.name}
              value={prefs.name}
              onChangeText={(t) => savePrefs({ ...prefs, name: t })}
            />
            <TextInput
              style={styles.bio}
              value={prefs.bio}
              onChangeText={(t) => savePrefs({ ...prefs, bio: t })}
              multiline
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settings</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.rowLabel}>Push notifications</Text>
            <Switch
              value={prefs.notifications}
              onValueChange={(v) => savePrefs({ ...prefs, notifications: v })}
            />
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.rowLabel}>Travel inspiration newsletter</Text>
            <Switch
              value={prefs.newsletter}
              onValueChange={(v) => savePrefs({ ...prefs, newsletter: v })}
            />
          </View>
          {saving ? <Text style={styles.saving}>Saving…</Text> : null}
        </View>

        <TouchableOpacity style={styles.signOut} onPress={onSignOut} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.signOutText}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scroll: { padding: responsiveValue(20, 28) },
  header: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 18 },
  avatarWrap: { width: 84, height: 84 },
  avatar: { width: 84, height: 84, borderRadius: 42 },
  avatarPlaceholder: { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontWeight: '800', fontSize: 32 },
  name: { color: '#fff', fontSize: responsiveValue(22, 24), fontWeight: '800' },
  bio: { color: '#bbb', marginTop: 6 },

  card: {
    backgroundColor: '#111',
    borderColor: '#1f1f1f',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    ...shadows.medium,
  },
  cardTitle: { color: '#fff', fontSize: responsiveValue(fontSizes.lg, 20), fontWeight: '700', marginBottom: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  rowLabel: { color: '#ddd' },
  saving: { color: '#888', marginTop: 8 },

  signOut: {
    marginTop: responsiveValue(24, 28),
    backgroundColor: '#fff',
    paddingVertical: buttonDimensions.height / 2,
    borderRadius: buttonDimensions.borderRadius,
    alignItems: 'center',
    ...shadows.medium,
  },
  signOutText: { color: '#000', fontWeight: '700', fontSize: responsiveValue(fontSizes.lg, 18) },
});
