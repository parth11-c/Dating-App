import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, TextInput, ActivityIndicator, Platform, ScrollView } from "react-native";
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
// Removed SafeAreaView and insets
import { useStore } from "@/store";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';

type Profile = {
  id: string;
  name: string;
  bio: string | null;
  gender: 'male' | 'female' | 'non-binary' | 'other' | null;
  date_of_birth: string | null; // ISO date
  location: string | null;
  avatar_url: string | null;
};

type Photo = { id: number; image_url: string };

export default function ProfileScreen() {
  const { currentUser, resolvedThemeMode, updateProfile } = useStore();
  const theme = useMemo(() => {
    if (resolvedThemeMode === 'light') {
      return {
        bg: '#FFF5F8', text: '#1a1a1a', sub: '#6b5b61', muted: '#7d6a72',
        card: '#ffffff', border: '#f0cfd8', chipBg: '#fff', chipBorder: '#edd0d9', chipText: '#5a4e53',
        surface: '#ffffff', avatarBg: '#f3dbe3', accent: '#ff5b80', accentSubtle: '#ffe9f0',
        buttonBg: '#ffffff', buttonBorder: '#f0cfd8',
      } as const;
    }
    return {
      bg: '#0a0a0a', text: '#fff', sub: '#888', muted: '#9aa0a6',
      card: '#111', border: '#222', chipBg: '#1a1a1a', chipBorder: '#2a2a2d', chipText: '#ddd',
      surface: '#0f0f0f', avatarBg: '#222', accent: '#ff5b80', accentSubtle: '#1a0f14',
      buttonBg: '#1f1f1f', buttonBorder: '#333',
    } as const;
  }, [resolvedThemeMode]);
  const [loading, setLoading] = React.useState(true);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [photos, setPhotos] = React.useState<Photo[]>([]);
  const [interestNames, setInterestNames] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = React.useState('');
  const PHOTOS_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_PHOTOS_BUCKET || 'profile-photos';
  const params = useLocalSearchParams<{ edit?: string }>();
  const [editMode, setEditMode] = React.useState(false);
  // Discovery preferences
  const [prefGender, setPrefGender] = React.useState<'all' | 'male' | 'female' | 'non-binary' | 'other'>('all');
  const [prefAgeMin, setPrefAgeMin] = React.useState(18);
  const [prefAgeMax, setPrefAgeMax] = React.useState(99);
  // DOB picker state
  const [dobYear, setDobYear] = React.useState<string>('');
  const [dobMonth, setDobMonth] = React.useState<string>('');
  const [dobDay, setDobDay] = React.useState<string>('');
  const [avatarMenuOpen, setAvatarMenuOpen] = React.useState(false);

  // Completion helpers
  const isComplete = React.useMemo(() => {
    const hasGender = !!profile?.gender;
    const hasDob = !!profile?.date_of_birth;
    const hasSixPhotos = photos.length === 4;
    return hasGender && hasDob && hasSixPhotos;
  }, [profile?.gender, profile?.date_of_birth, photos.length]);
  const completionSteps: { key: string; label: string; done: boolean }[] = [
    { key: 'gender', label: 'Set your gender', done: !!profile?.gender },
    { key: 'dob', label: 'Add your date of birth', done: !!profile?.date_of_birth },
    { key: 'photos', label: 'Upload exactly 4 photos', done: photos.length === 4 },
  ];
  const completionPercent = Math.round((completionSteps.filter(s => s.done).length / completionSteps.length) * 100);

  const onLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    } finally {
      router.replace('/auth/sign-in' as any);
    }
  };

  const captureAndUploadPhoto = async () => {
    try {
      if (photos.length >= 4) {
        Alert.alert('Photo limit reached', 'You can upload exactly 4 photos. Delete one to add another.');
        return;
      }
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera permission to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const assetUri = result.assets[0].uri;
      const res = await fetch(assetUri);
      const arrayBuffer = await res.arrayBuffer();
      const filename = `${currentUser.id}/${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}.jpg`;
      const { error: upErr } = await supabase.storage.from(PHOTOS_BUCKET).upload(filename, arrayBuffer, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(filename);
      const publicUrl = data.publicUrl;
      const { error: insErr } = await supabase.from('photos').insert({ user_id: currentUser.id, image_url: publicUrl });
      if (insErr) throw insErr;
      await load();
    } catch (e: any) {
      Alert.alert('Capture failed', e?.message || 'Please try again.');
    }
  };

  const pickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need photo library permission to pick an image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1,1],
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const assetUri = result.assets[0].uri;
      const res = await updateProfile({ avatarUri: assetUri });
      if (!res.ok) {
        Alert.alert('Avatar update failed', res.reason);
        return;
      }
      setAvatarMenuOpen(false);
      await load();
    } catch (e: any) {
      Alert.alert('Avatar update failed', e?.message || 'Please try again.');
    }
  };

  const captureAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera permission to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.9,
        allowsEditing: true,
        aspect: [1,1],
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const assetUri = result.assets[0].uri;
      const res = await updateProfile({ avatarUri: assetUri });
      if (!res.ok) {
        Alert.alert('Avatar update failed', res.reason);
        return;
      }
      setAvatarMenuOpen(false);
      await load();
    } catch (e: any) {
      Alert.alert('Avatar update failed', e?.message || 'Please try again.');
    }
  };

  const pickAndUploadPhoto = async () => {
    try {
      if (photos.length >= 4) {
        Alert.alert('Photo limit reached', 'You can upload exactly 4 photos. Delete one to add another.');
        return;
      }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need photo library permission to pick an image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const assetUri = result.assets[0].uri;
      if (Platform.OS === 'web' && assetUri.startsWith('file://')) {
        Alert.alert('Upload unavailable', 'On web, please paste an https image URL instead.');
        return;
      }
      const res = await fetch(assetUri);
      const arrayBuffer = await res.arrayBuffer();
      const lower = assetUri.toLowerCase();
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
      const { error: upErr } = await supabase.storage.from(PHOTOS_BUCKET).upload(filename, arrayBuffer, { contentType, upsert: false });
      if (upErr) {
        const reason = (upErr as any)?.message || String(upErr);
        if (reason?.toLowerCase().includes('bucket') && reason?.toLowerCase().includes('not found')) {
          Alert.alert('Storage bucket missing', `Create bucket "${PHOTOS_BUCKET}" in Supabase Storage and make it public, or set EXPO_PUBLIC_SUPABASE_PHOTOS_BUCKET.`);
          return;
        }
        throw upErr;
      }
      const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(filename);
      const publicUrl = data.publicUrl;
      const { error: insErr } = await supabase.from('photos').insert({ user_id: currentUser.id, image_url: publicUrl });
      if (insErr) throw insErr;
      await load();
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Please try again.');
    }
  };

  const load = React.useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [{ data: p }, { data: ph }, { data: ui }] = await Promise.all([
        supabase.from('profiles').select('id, name, bio, gender, date_of_birth, location, avatar_url').eq('id', currentUser.id).maybeSingle(),
        supabase.from('photos').select('id, image_url').eq('user_id', currentUser.id).order('created_at', { ascending: false }),
        supabase.from('user_interests').select('interest_id, interests(name)').eq('user_id', currentUser.id)
      ]);
      const baseProfile = (p as any) || {
        id: currentUser.id,
        name: currentUser.name || 'User',
        bio: '',
        gender: null,
        date_of_birth: null,
        location: '',
        avatar_url: null,
      };
      setProfile(baseProfile);
      setPhotos((ph as any[]) || []);
      // interests join may come as { interests: { name } }
      const names = ((ui as any[]) || [])
        .map((r) => r?.interests?.name)
        .filter((n: any) => typeof n === 'string');
      setInterestNames(names);
      // Load discovery preferences
      const [g, min, max] = await Promise.all([
        AsyncStorage.getItem('filters.gender'),
        AsyncStorage.getItem('filters.ageMin'),
        AsyncStorage.getItem('filters.ageMax'),
      ]);
      if (g && ['all','male','female','non-binary','other'].includes(g)) setPrefGender(g as any);
      if (min) setPrefAgeMin(Math.max(18, Math.min(99, parseInt(min) || 18)));
      if (max) setPrefAgeMax(Math.max(18, Math.min(99, parseInt(max) || 99)));
      // Initialize DOB pickers from profile
      const iso = baseProfile?.date_of_birth as string | null;
      if (iso) {
        const d = new Date(iso);
        if (!isNaN(d.getTime())) {
          setDobYear(String(d.getFullYear()));
          setDobMonth(String(d.getMonth() + 1));
          setDobDay(String(d.getDate()));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  React.useEffect(() => { load(); }, [load]);
  // Initialize edit mode from query
  React.useEffect(() => {
    if (params?.edit === '1' || params?.edit === 'true') {
      setEditMode(true);
    }
  }, [params?.edit]);

  // Sync DOB pickers into ISO date on profile
  React.useEffect(() => {
    if (dobYear && dobMonth && dobDay) {
      const mm = String(parseInt(dobMonth)).padStart(2, '0');
      const dd = String(parseInt(dobDay)).padStart(2, '0');
      const iso = `${dobYear}-${mm}-${dd}`;
      setProfile(prev => (prev && prev.date_of_birth !== iso ? { ...prev, date_of_birth: iso } : prev));
    }
  }, [dobYear, dobMonth, dobDay]);

  const saveProfile = async () => {
    if (!profile || !currentUser?.id) return;
    // Basic validation
    if (!profile.gender) return Alert.alert('Missing info', 'Please select your gender.');
    if (!profile.date_of_birth) return Alert.alert('Missing info', 'Please add your date of birth.');
    if (photos.length !== 4) return Alert.alert('Photos needed', 'Please upload exactly 4 photos to proceed.');
    setSaving(true);
    try {
      const payload: Partial<Profile> & { id: string } = {
        id: currentUser.id,
        name: profile.name || currentUser.name || 'User',
        bio: profile.bio ?? null,
        gender: profile.gender ?? null,
        date_of_birth: profile.date_of_birth ?? null,
        location: profile.location ?? null,
        avatar_url: profile.avatar_url ?? null,
      };
      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      if (error) Alert.alert('Error', error.message);
      else Alert.alert('Saved', 'Profile updated');
      // Persist discovery preferences
      await AsyncStorage.multiSet([
        ['filters.gender', prefGender],
        ['filters.ageMin', String(prefAgeMin)],
        ['filters.ageMax', String(prefAgeMax)],
      ]);
    } finally {
      setSaving(false);
    }
  };

  const addPhoto = async () => {
    const url = newPhotoUrl.trim();
    if (!url) return;
    if (photos.length >= 4) {
      Alert.alert('Photo limit reached', 'You can upload exactly 4 photos. Delete one to add another.');
      return;
    }
    try {
      const { error } = await supabase.from('photos').insert({ user_id: currentUser.id, image_url: url });
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      setNewPhotoUrl('');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add photo');
    }
  };

  // Derive storage object path from a public URL
  const storagePathFromPublicUrl = (publicUrl: string, bucket: string): string | null => {
    // Expected format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return publicUrl.substring(idx + marker.length);
  };

  const deletePhoto = async (photoId: number) => {
    Alert.alert('Delete photo', 'Remove this photo from your profile?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          // Find the photo URL from current state
          const photo = photos.find(p => p.id === photoId);
          const imageUrl = photo?.image_url;
          const storagePath = imageUrl ? storagePathFromPublicUrl(imageUrl, PHOTOS_BUCKET) : null;
          if (storagePath) {
            const { error: rmErr } = await supabase.storage.from(PHOTOS_BUCKET).remove([storagePath]);
            if (rmErr && !String(rmErr.message || rmErr).toLowerCase().includes('not found')) {
              console.warn('Storage remove failed:', rmErr);
            }
          }
          const { error } = await supabase.from('photos').delete().eq('id', photoId);
          if (error) Alert.alert('Error', error.message);
          else await load();
        } catch (e: any) {
          Alert.alert('Error', e?.message || 'Failed to delete photo');
        }
      }}
    ]);
  };
 
  // Helpers (must be before any early return to keep hook order stable)
  const age = React.useMemo(() => {
    const iso = profile?.date_of_birth;
    if (!iso) return undefined;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return undefined;
    const today = new Date();
    let a = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) a--;
    return a;
  }, [profile?.date_of_birth]);

  const chips: string[] = React.useMemo(() => {
    const out: string[] = [];
    // Use available fields; placeholder onboarding details not yet implemented
    if (profile?.gender) out.push(profile.gender);
    if (profile?.location) out.push(profile.location);
    if (age !== undefined) out.push(`${age} yrs`);
    return out;
  }, [profile?.gender, profile?.location, age]);

  const hero = profile?.avatar_url || photos[0]?.image_url;

  // Auto-set avatar once if missing, using first photo
  const autoAvatarSetRef = React.useRef(false);
  React.useEffect(() => {
    if (!autoAvatarSetRef.current && profile && !profile.avatar_url && photos && photos.length > 0 && photos[0]?.image_url) {
      autoAvatarSetRef.current = true;
      updateProfile({ avatarUri: photos[0].image_url })
        .then(() => load())
        .catch(() => {});
    }
  }, [profile?.avatar_url, photos?.length]);

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#fff" />
        <Text style={{ color: '#9aa0a6', marginTop: 8 }}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Centered profile header: large circular image, centered name, and two centered buttons */}
      <View style={[styles.topHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.centerHeader}>
          <View style={styles.centerPicWrap}>
            {hero ? (
              <Image source={{ uri: hero }} style={styles.centerPic} />
            ) : (
              <View style={[styles.centerPic, { backgroundColor: theme.avatarBg, alignItems: 'center', justifyContent: 'center' }]}> 
                <Ionicons name="person" size={48} color={theme.sub} />
              </View>
            )}
          </View>
          <Text style={[styles.centerName, { color: theme.text }]}>{profile?.name || currentUser.name || 'User'}</Text>
          <View style={styles.centerButtonsRow}>
            <TouchableOpacity
              style={[styles.centerBtn, styles.centerBtnPrimary, resolvedThemeMode === 'light' ? { backgroundColor: '#fff', borderColor: '#fff' } : null]}
              onPress={() => router.push('/(tabs)/profile-view' as any)}
            >
              <Text style={[styles.centerBtnText, styles.centerBtnTextPrimary]}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.centerBtn, { backgroundColor: theme.buttonBg, borderColor: theme.buttonBorder }]}
              onPress={() => router.push('/(tabs)/profile-edit' as any)}
            >
              <Text style={[styles.centerBtnText, { color: resolvedThemeMode === 'light' ? theme.text : '#ddd' }]}>Edit</Text>
            </TouchableOpacity>
          </View>
          {avatarMenuOpen && (
            <View style={styles.avatarMenu}>
              <TouchableOpacity style={[styles.menuBtn, styles.menuPrimary]} onPress={pickAvatar}>
                <Text style={[styles.menuBtnText, styles.menuBtnTextPrimary]}>Set from library</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuBtn} onPress={captureAvatar}>
                <Text style={styles.menuBtnText}>Take photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuBtn} onPress={pickAndUploadPhoto}>
                <Text style={styles.menuBtnText}>Upload different pic</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuCancel} onPress={() => setAvatarMenuOpen(false)}>
                <Text style={styles.menuCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 6 ,marginTop: 16},
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#444", marginRight: 12 },
  name: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 2 },
  sub: { color: "#aaa" },
  section: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 8, marginBottom: 6 },
  muted: { color: "#9aa0a6" },
  card: { backgroundColor: "#111", borderColor: "#222", borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  cardRounded: { backgroundColor: "#111", borderColor: "#222", borderWidth: 1, borderRadius: 16, padding: 14, margin: 12 },
  cardTitle: { color: "#fff", fontWeight: "600", marginBottom: 4 },
  mutedSmall: { color: "#888", fontSize: 12 },
  actions: { marginBottom: 16, gap: 10 },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', backgroundColor: '#0f1b28', borderWidth: 1, borderColor: '#2a5b86', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10 },
  editBtnDisabled: { opacity: 0.6 },
  editBtnText: { color: '#4da3ff', fontWeight: '700' },
  // Inputs and labels
  label: { color: '#ddd', fontSize: 13, marginTop: 8, marginBottom: 6, fontWeight: '600' },
  input: { color: '#fff', backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  // Segmented control
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: { backgroundColor: '#0f0f10', borderWidth: 1, borderColor: '#1f1f22', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  segmentActive: { backgroundColor: '#1a2b3d', borderColor: '#2a5b86' },
  segmentText: { color: '#9aa0a6', fontSize: 12, fontWeight: '700' },
  segmentTextActive: { color: '#cce6ff' },
  // Add photo button
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#cce6ff', borderWidth: 1, borderColor: '#7cc5e6', paddingHorizontal: 12, borderRadius: 10 },
  addBtnText: { color: '#0a0a0a', fontWeight: '800' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', backgroundColor: '#c0392b', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#9e2f23' },
  logoutBtnText: { color: '#fff', fontWeight: '800' },
  gridContent: { paddingTop: 8 },
  gridRow: { justifyContent: 'space-between', marginBottom: 8 },
  gridItem: { 
    backgroundColor: '#111', 
    borderColor: '#222', 
    borderWidth: 1, 
    borderRadius: 10, 
    overflow: 'hidden', 
    width: '49%',
    aspectRatio: 1,
  },
  gridImage: { width: '100%', height: '100%' },
  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  deleteBtnBg: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  // Completion UI
  progressBarWrap: { height: 8, borderRadius: 6, backgroundColor: '#161a1f', borderWidth: 1, borderColor: '#232a33', overflow: 'hidden', marginTop: 6, marginBottom: 8 },
  progressBarFill: { height: '100%', backgroundColor: '#4da3ff' },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  // New public view styles
  heroWrap: { margin: 12, borderRadius: 20, overflow: 'hidden' },
  heroImage: { width: '100%', aspectRatio: 3/4, borderRadius: 20 },
  heroOverlay: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', marginBottom: 8 },
  badgeText: { color: '#fff', fontWeight: '700' },
  heroName: { color: '#fff', fontSize: 26, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  chip: { backgroundColor: '#1a1a1a', borderColor: '#2a2a2d', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 },
  chipText: { color: '#ddd', fontWeight: '600' },
  photoCard: { marginHorizontal: 12, marginBottom: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#222' },
  photoImage: { width: '100%', aspectRatio: 3/4 },
  bottomBarRow: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', gap: 10 },
  switchBtn: { flex: 1, backgroundColor: '#1f1f1f', borderWidth: 1, borderColor: '#333', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  switchBtnActive: { backgroundColor: '#fff', borderColor: '#fff' },
  switchBtnText: { color: '#ddd', fontWeight: '800', fontSize: 16 },
  switchBtnTextActive: { color: '#000' },
  // New header + toggle styles
  topHeader: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#1b1b1b' },
  picRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  picWrap: { width: 54, height: 54, borderRadius: 27, overflow: 'hidden', borderWidth: 2, borderColor: '#2a2a2d' },
  pic: { width: '100%', height: '100%', borderRadius: 27 },
  profileTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  toggleRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  toggleBtn: { flex: 1, backgroundColor: '#1f1f1f', borderWidth: 1, borderColor: '#333', borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#fff', borderColor: '#fff' },
  toggleBtnText: { color: '#ddd', fontWeight: '800', fontSize: 15 },
  toggleBtnTextActive: { color: '#000' },
  // Centered header styles
  centerHeader: { alignItems: 'center', paddingTop: 12, paddingBottom: 16 },
  centerPicWrap: { width: 120, height: 120, borderRadius: 60, overflow: 'hidden', borderWidth: 2, borderColor: '#2a2a2d' },
  centerPic: { width: '100%', height: '100%', borderRadius: 60 },
  centerName: { marginTop: 10, color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  centerButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 12, justifyContent: 'center' },
  centerBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1, alignItems: 'center', minWidth: 120 },
  centerBtnPrimary: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
  centerBtnText: { color: '#ddd', fontWeight: '800', fontSize: 15 },
  centerBtnTextPrimary: { color: '#000' },
  // Avatar action menu
  avatarMenu: { width: '100%', paddingHorizontal: 12, marginTop: 12 },
  menuBtn: { width: '100%', backgroundColor: '#1f1f1f', borderWidth: 1, borderColor: '#333', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  menuPrimary: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
  menuBtnText: { color: '#ddd', fontWeight: '800' },
  menuBtnTextPrimary: { color: '#000' },
  menuCancel: { marginTop: 8, alignItems: 'center' },
  menuCancelText: { color: '#9aa0a6', fontWeight: '600' },
});
