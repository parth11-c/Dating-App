import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import { useOnboarding } from "@/context/onboarding";
import { useStore } from "@/store";
import { supabase } from "@/lib/supabase";

const PHOTOS_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_PHOTOS_BUCKET || 'profile-photos';

export default function OnboardingPhotos() {
  const { draft, update, addPhoto, removePhoto, clear } = useOnboarding();
  const { currentUser } = useStore();
  const [saving, setSaving] = React.useState(false);
  const photos = draft.photos || [];

  const pickFromLibrary = async () => {
    try {
      if (photos.length >= 6) {
        Alert.alert('Limit', 'Please add exactly 6 photos. Remove one to add another.');
        return;
      }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need photo library permission to pick.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      addPhoto(result.assets[0].uri);
    } catch (e: any) {
      Alert.alert('Pick failed', e?.message || 'Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      if (photos.length >= 6) {
        Alert.alert('Limit', 'Please add exactly 6 photos. Remove one to add another.');
        return;
      }
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera permission to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      addPhoto(result.assets[0].uri);
    } catch (e: any) {
      Alert.alert('Capture failed', e?.message || 'Please try again.');
    }
  };

  const finish = async () => {
    if (!currentUser?.id) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }
    // Validate draft
    if (!draft.name?.trim()) return Alert.alert('Missing name', 'Please enter your name.');
    if (!draft.date_of_birth) return Alert.alert('Missing birthday', 'Please enter your date of birth.');
    if (!draft.gender || !draft.pronoun) return Alert.alert('Incomplete', 'Please select your pronoun and gender.');
    if (!draft.preferred_gender) return Alert.alert('Incomplete', 'Please select who you want to see.');
    if (photos.length !== 6) return Alert.alert('Photos needed', 'Please add exactly 6 photos.');

    setSaving(true);
    try {
      // 1) Upsert profile
      const profilePayload: any = {
        id: currentUser.id,
        name: draft.name,
        bio: draft.bio ?? null,
        gender: draft.gender,
        pronoun: draft.pronoun,
        preferred_gender: draft.preferred_gender,
        date_of_birth: draft.date_of_birth,
      };
      const { error: upErr } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });
      if (upErr) throw upErr;

      // 2) Remove any existing photo rows to avoid duplicates
      await supabase.from('photos').delete().eq('user_id', currentUser.id);

      // 3) Upload each photo and insert row
      for (const p of photos) {
        const res = await fetch(p.uri);
        const arrayBuffer = await res.arrayBuffer();
        const lower = p.uri.toLowerCase();
        let ext = 'jpg';
        if (lower.includes('.png')) ext = 'png';
        else if (lower.includes('.webp')) ext = 'webp';
        else if (lower.includes('.heic')) ext = 'heic';
        else if (lower.includes('.heif')) ext = 'heif';
        const contentType =
          ext === 'png' ? 'image/png' :
          ext === 'webp' ? 'image/webp' :
          ext === 'heic' ? 'image/heic' :
          ext === 'heif' ? 'image/heif' :
          'image/jpeg';
        const filename = `${currentUser.id}/${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}.${ext}`;
        const { error: storageErr } = await supabase.storage.from(PHOTOS_BUCKET).upload(filename, arrayBuffer, { contentType, upsert: false });
        if (storageErr) {
          const reason = (storageErr as any)?.message || String(storageErr);
          if (reason?.toLowerCase().includes('bucket') && reason?.toLowerCase().includes('not found')) {
            Alert.alert('Storage bucket missing', `Create bucket "${PHOTOS_BUCKET}" in Supabase Storage and make it public, or set EXPO_PUBLIC_SUPABASE_PHOTOS_BUCKET.`);
            throw storageErr;
          }
          throw storageErr;
        }
        const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(filename);
        const publicUrl = data.publicUrl;
        const { error: insErr } = await supabase.from('photos').insert({ user_id: currentUser.id, image_url: publicUrl });
        if (insErr) throw insErr;
      }

      // 4) Clear local draft and go to home
      clear();
      router.replace('/(tabs)/home' as any);
    } catch (e: any) {
      Alert.alert('Failed to finish', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.title}>Add 6 photos</Text>
        <Text style={styles.subtitle}>Pick or take exactly 6 photos to complete your profile.</Text>
        <View style={{ height: 12 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={[styles.btn, photos.length >= 6 && styles.btnDisabled]} onPress={pickFromLibrary} disabled={photos.length >= 6 || saving}>
            <Text style={styles.btnText}>Pick from library</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, photos.length >= 6 && styles.btnDisabled]} onPress={takePhoto} disabled={photos.length >= 6 || saving}>
            <Text style={styles.btnText}>Take a photo</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingVertical: 12 }}>
          <View style={styles.grid}> 
            {photos.map((p) => (
              <View key={p.uri} style={styles.gridItem}>
                <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} />
                <TouchableOpacity style={styles.remove} onPress={() => removePhoto(p.uri)} disabled={saving}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>X</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <Text style={styles.mutedSmall}>Photos added: {photos.length}/6</Text>
        </ScrollView>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.cta, (photos.length !== 6 || saving) && styles.ctaDisabled]} onPress={finish} disabled={photos.length !== 6 || saving}>
          {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.ctaText}>Finish</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  body: { flex: 1, padding: 16 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#9aa0a6", marginTop: 6 },
  btn: { backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  btnText: { color: '#000', fontWeight: '800' },
  btnDisabled: { opacity: 0.6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  gridItem: { width: '31%', aspectRatio: 1, backgroundColor: '#111', borderColor: '#222', borderWidth: 1, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  remove: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  mutedSmall: { color: '#888', fontSize: 12, marginTop: 6 },
  footer: { padding: 16 },
  cta: { backgroundColor: "#fff", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: "#000", fontSize: 16, fontWeight: "800" },
});
