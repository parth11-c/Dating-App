import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, ImageBackground, TextInput, Switch, ScrollView, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SafeAreaWrapper from '@/components/SafeAreaWrapper';
import { fontSizes, responsiveValue, shadows, buttonDimensions } from '@/lib/responsive';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';

const STORAGE_KEY = '@profile_prefs_v1';

type Prefs = {
  name: string;
  bio: string;
  notifications: boolean;
  newsletter: boolean;
  avatarUri?: string;
  coverUri?: string;
  followers?: number;
  following?: number;
  trips?: number;
  socials?: {
    instagram?: string;
    twitter?: string;
    website?: string;
  };
};

const defaultPrefs: Prefs = {
  name: 'Traveler',
  bio: 'Wanderlust at heart. Collecting memories across the world.',
  notifications: true,
  newsletter: false,
  followers: 128,
  following: 87,
  trips: 12,
  socials: {
    instagram: 'https://instagram.com/',
    twitter: 'https://x.com/',
    website: 'https://example.com',
  },
};

export default function ProfileScreen() {
  const colors = useThemeColors();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [editMode, setEditMode] = useState(false);

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
    router.replace('/auth/login');
  };

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Cover header */}
        {prefs.coverUri ? (
          <ImageBackground source={{ uri: prefs.coverUri }} style={styles.cover} imageStyle={styles.coverImage}>
            <View style={styles.coverOverlay} />
          </ImageBackground>
        ) : (
          <View style={[styles.cover, { backgroundColor: colors.mode === 'dark' ? '#121212' : '#f0f0f0' }]} />
        )}

        {/* Avatar overlapping */}
        <View style={styles.avatarContainer}>
          {prefs.avatarUri ? (
            <Image source={{ uri: prefs.avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.mode === 'dark' ? '#1a1a1a' : '#eaeaea' }]}>
              <Text style={[styles.avatarInitial, { color: colors.text }]}>{prefs.name?.[0] ?? 'T'}</Text>
            </View>
          )}
        </View>

        {/* Edit toggle */}
        <View style={styles.editRow}>
          <TouchableOpacity style={[styles.editBtn, { borderColor: colors.mode === 'dark' ? '#1f1f1f' : '#e5e5e5' }]} onPress={() => setEditMode((v) => !v)}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{editMode ? 'Done' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        {/* Name & bio */}
        <View style={styles.nameBlock}>
          {editMode ? (
            <TextInput
              style={[styles.name, { color: colors.text, textAlign: 'center' }]}
              value={prefs.name}
              onChangeText={(t) => savePrefs({ ...prefs, name: t })}
            />
          ) : (
            <Text style={[styles.name, { color: colors.text, textAlign: 'center' }]}>{prefs.name}</Text>
          )}
          {editMode ? (
            <TextInput
              style={[styles.bio, { color: colors.icon, textAlign: 'center' }]}
              value={prefs.bio}
              onChangeText={(t) => savePrefs({ ...prefs, bio: t })}
              multiline
            />
          ) : (
            <Text style={[styles.bio, { color: colors.icon, textAlign: 'center' }]}>{prefs.bio}</Text>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.mode === 'dark' ? '#111' : '#fafafa', borderColor: colors.mode === 'dark' ? '#1f1f1f' : '#e5e5e5' }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{prefs.trips ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Trips</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.mode === 'dark' ? '#111' : '#fafafa', borderColor: colors.mode === 'dark' ? '#1f1f1f' : '#e5e5e5' }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{prefs.followers ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Followers</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.mode === 'dark' ? '#111' : '#fafafa', borderColor: colors.mode === 'dark' ? '#1f1f1f' : '#e5e5e5' }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{prefs.following ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Following</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.mode === 'dark' ? '#111' : '#fafafa', borderColor: colors.mode === 'dark' ? '#1f1f1f' : '#e5e5e5' }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Settings</Text>
          <View style={styles.rowBetween}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Push notifications</Text>
            <Switch
              value={prefs.notifications}
              onValueChange={(v) => savePrefs({ ...prefs, notifications: v })}
            />
          </View>
          <View style={styles.rowBetween}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Travel inspiration newsletter</Text>
            <Switch
              value={prefs.newsletter}
              onValueChange={(v) => savePrefs({ ...prefs, newsletter: v })}
            />
          </View>
          {saving ? <Text style={[styles.saving, { color: colors.icon }]}>Saving…</Text> : null}
        </View>

        {/* Socials */}
        <View style={[styles.card, { backgroundColor: colors.mode === 'dark' ? '#111' : '#fafafa', borderColor: colors.mode === 'dark' ? '#1f1f1f' : '#e5e5e5' }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Social Profiles</Text>

          {editMode ? (
            <View style={{ gap: 10, marginBottom: 12 }}>
              <TextInput
                placeholder="Instagram URL"
                placeholderTextColor={colors.icon}
                autoCapitalize="none"
                keyboardType="url"
                value={prefs.socials?.instagram ?? ''}
                onChangeText={(t) => savePrefs({ ...prefs, socials: { ...prefs.socials, instagram: t } })}
                style={[styles.socialInput, { color: colors.text, borderColor: colors.mode === 'dark' ? '#1f1f1f' : '#e5e5e5', backgroundColor: colors.mode === 'dark' ? '#0f0f0f' : '#fff' }]}
              />
              <TextInput
                placeholder="Twitter/X URL"
                placeholderTextColor={colors.icon}
                autoCapitalize="none"
                keyboardType="url"
                value={prefs.socials?.twitter ?? ''}
                onChangeText={(t) => savePrefs({ ...prefs, socials: { ...prefs.socials, twitter: t } })}
                style={[styles.socialInput, { color: colors.text, borderColor: colors.mode === 'dark' ? '#1f1f1f' : '#e5e5e5', backgroundColor: colors.mode === 'dark' ? '#0f0f0f' : '#fff' }]}
              />
              <TextInput
                placeholder="Website URL"
                placeholderTextColor={colors.icon}
                autoCapitalize="none"
                keyboardType="url"
                value={prefs.socials?.website ?? ''}
                onChangeText={(t) => savePrefs({ ...prefs, socials: { ...prefs.socials, website: t } })}
                style={[styles.socialInput, { color: colors.text, borderColor: colors.mode === 'dark' ? '#1f1f1f' : '#e5e5e5', backgroundColor: colors.mode === 'dark' ? '#0f0f0f' : '#fff' }]}
              />
            </View>
          ) : null}

          {/* Quick open buttons / Read-only view */}
          <View style={styles.socialsRow}>
            {prefs.socials?.instagram ? (
              <TouchableOpacity onPress={() => Linking.openURL(prefs.socials!.instagram!)} style={styles.socialBtn}>
                <Text style={[styles.socialText, { color: colors.text }]}>Instagram</Text>
              </TouchableOpacity>
            ) : null}
            {prefs.socials?.twitter ? (
              <TouchableOpacity onPress={() => Linking.openURL(prefs.socials!.twitter!)} style={styles.socialBtn}>
                <Text style={[styles.socialText, { color: colors.text }]}>Twitter</Text>
              </TouchableOpacity>
            ) : null}
            {prefs.socials?.website ? (
              <TouchableOpacity onPress={() => Linking.openURL(prefs.socials!.website!)} style={styles.socialBtn}>
                <Text style={[styles.socialText, { color: colors.text }]}>Website</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <TouchableOpacity style={[styles.signOut, { backgroundColor: colors.text }]} onPress={onSignOut} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.signOutText, { color: colors.background }]}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scroll: { padding: 0, paddingBottom: responsiveValue(20, 28) },
  cover: { height: 160, width: '100%' },
  coverImage: { width: '100%', height: '100%' },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  avatarContainer: { alignItems: 'center', marginTop: -42 },
  avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontWeight: '800', fontSize: 32 },
  nameBlock: { paddingHorizontal: responsiveValue(20, 28), marginTop: 10, alignItems: 'center' },
  name: { color: '#fff', fontSize: responsiveValue(22, 24), fontWeight: '800' },
  bio: { color: '#bbb', marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: responsiveValue(16, 22), marginTop: 14 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  statValue: { fontWeight: '800', fontSize: 18 },
  statLabel: { marginTop: 4, fontSize: 12 },

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

  editRow: { alignItems: 'center', marginTop: 10 },
  editBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1 },

  socialsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  socialBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#2a2a2a' },
  socialText: { fontWeight: '600' },
  socialInput: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },

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
