import React from "react";
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
  const { currentUser } = useStore();
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

  // Completion helpers
  const isComplete = React.useMemo(() => {
    const hasGender = !!profile?.gender;
    const hasDob = !!profile?.date_of_birth;
    const hasSixPhotos = photos.length === 6;
    return hasGender && hasDob && hasSixPhotos;
  }, [profile?.gender, profile?.date_of_birth, photos.length]);
  const completionSteps: { key: string; label: string; done: boolean }[] = [
    { key: 'gender', label: 'Set your gender', done: !!profile?.gender },
    { key: 'dob', label: 'Add your date of birth', done: !!profile?.date_of_birth },
    { key: 'photos', label: 'Upload exactly 6 photos', done: photos.length === 6 },
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
      if (photos.length >= 6) {
        Alert.alert('Photo limit reached', 'You can upload exactly 6 photos. Delete one to add another.');
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
      const res = await fetch(assetUri);
      const arrayBuffer = await res.arrayBuffer();
      const lower = assetUri.toLowerCase();
      let ext = 'jpg';
      if (lower.includes('.png')) ext = 'png';
      else if (lower.includes('.webp')) ext = 'webp';
      const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const filename = `${currentUser.id}/avatar_${Date.now().toString(36)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(PHOTOS_BUCKET).upload(filename, arrayBuffer, { contentType, upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(filename);
      const publicUrl = data.publicUrl;
      setProfile(prev => (prev ? { ...prev, avatar_url: publicUrl } : prev));
    } catch (e: any) {
      Alert.alert('Avatar upload failed', e?.message || 'Please try again.');
    }
  };

  const pickAndUploadPhoto = async () => {
    try {
      if (photos.length >= 6) {
        Alert.alert('Photo limit reached', 'You can upload exactly 6 photos. Delete one to add another.');
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
    if (photos.length !== 6) return Alert.alert('Photos needed', 'Please upload exactly 6 photos to proceed.');
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
    if (photos.length >= 6) {
      Alert.alert('Photo limit reached', 'You can upload exactly 6 photos. Delete one to add another.');
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

  const deletePhoto = async (photoId: number) => {
    Alert.alert('Delete photo', 'Remove this photo from your profile?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('photos').delete().eq('id', photoId);
        if (error) Alert.alert('Error', error.message);
        else await load();
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

  const hero = photos[0]?.image_url;

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#fff" />
        <Text style={{ color: '#9aa0a6', marginTop: 8 }}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!editMode && (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {/* Header title like "Parth, 21" */}
            <Text style={[styles.name, { paddingHorizontal: 12, marginTop: 16 }]}>
              {(profile?.name || currentUser.name || 'User')}{age !== undefined ? `, ${age}` : ''}
            </Text>

            {/* Hero image */}
            {hero ? (
              <View style={styles.heroWrap}>
                <Image source={{ uri: hero }} style={styles.heroImage} />
                <View style={styles.heroOverlay}>
                  <View style={styles.badge}><Text style={styles.badgeText}>New here</Text></View>
                  <Text style={styles.heroName}>{(profile?.name || currentUser.name || 'User')}{age !== undefined ? `, ${age}` : ''}</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.heroWrap, { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#222' }]}>
                <Ionicons name="image-outline" size={24} color="#666" />
                <Text style={{ color: '#777', marginTop: 6 }}>Add photos to showcase your profile</Text>
              </View>
            )}

            {/* About me chips */}
            <View style={styles.cardRounded}>
              <Text style={styles.cardTitle}>About me</Text>
              {chips.length === 0 ? (
                <Text style={styles.mutedSmall}>Add more details to your profile.</Text>
              ) : (
                <View style={styles.chipsWrap}>
                  {chips.map((c, idx) => (
                    <View key={`${c}-${idx}`} style={styles.chip}><Text style={styles.chipText}>{c}</Text></View>
                  ))}
                </View>
              )}
              {profile?.bio ? <Text style={[styles.muted, { marginTop: 8 }]}>{profile.bio}</Text> : null}
            </View>

            {/* Remaining photos */}
            {photos.slice(1).map((p, i) => (
              <View key={p.id} style={styles.photoCard}>
                <Image source={{ uri: p.image_url }} style={styles.photoImage} />
              </View>
            ))}

            {/* Interests */}
            <View style={styles.cardRounded}>
              <Text style={styles.cardTitle}>Interests</Text>
              {interestNames.length === 0 ? (
                <Text style={styles.mutedSmall}>Add your interests from the Interests tab.</Text>
              ) : (
                <View style={styles.chipsWrap}>
                  {interestNames.map((n) => (
                    <View key={n} style={styles.chip}><Text style={styles.chipText}>{n}</Text></View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Sticky bottom actions */}
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.editPrimaryBtn} onPress={() => setEditMode(true)}>
              <Text style={styles.editPrimaryText}>Edit profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={16} color="#fff" />
              <Text style={styles.logoutBtnText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Editable fields */}
      {editMode && (
        <>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.editBtn} onPress={async () => { await saveProfile(); setEditMode(false); }} disabled={saving}>
              <Ionicons name="save-outline" size={16} color="#4da3ff" />
              <Text style={styles.editBtnText}>{saving ? 'Saving…' : 'Save profile'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={16} color="#fff" />
              <Text style={styles.logoutBtnText}>Logout</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>About</Text>
            <TextInput
              placeholder="Your bio"
              placeholderTextColor="#777"
              style={styles.input}
              multiline
              value={profile?.bio ?? ''}
              onChangeText={(t) => setProfile((prev) => (prev ? { ...prev, bio: t } : prev))}
            />
            <Text style={styles.label}>Location</Text>
            <TextInput
              placeholder="City"
              placeholderTextColor="#777"
              style={styles.input}
              value={profile?.location ?? ''}
              onChangeText={(t) => setProfile((prev) => (prev ? { ...prev, location: t } : prev))}
            />
            <Text style={styles.label}>Gender</Text>
            <View style={styles.segmentRow}>
              {(['male','female','non-binary','other'] as const).map(g => (
                <TouchableOpacity key={g} style={[styles.segment, profile?.gender === g && styles.segmentActive]} onPress={() => setProfile((prev) => (prev ? { ...prev, gender: g } : prev))}>
                  <Text style={[styles.segmentText, profile?.gender === g && styles.segmentTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Date of birth</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Picker selectedValue={dobDay} onValueChange={(v) => setDobDay(String(v))} style={styles.input as any}>
                  <Picker.Item label="Day" value="" />
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <Picker.Item key={d} label={String(d)} value={String(d)} />
                  ))}
                </Picker>
              </View>
              <View style={{ flex: 1 }}>
                <Picker selectedValue={dobMonth} onValueChange={(v) => setDobMonth(String(v))} style={styles.input as any}>
                  <Picker.Item label="Month" value="" />
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <Picker.Item key={m} label={String(m)} value={String(m)} />
                  ))}
                </Picker>
              </View>
              <View style={{ flex: 1.3 }}>
                <Picker selectedValue={dobYear} onValueChange={(v) => setDobYear(String(v))} style={styles.input as any}>
                  <Picker.Item label="Year" value="" />
                  {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <Picker.Item key={y} label={String(y)} value={String(y)} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Discovery Preferences */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Discovery preferences</Text>
            <Text style={styles.label}>Show me</Text>
            <View style={styles.segmentRow}>
              {(['all','male','female','non-binary','other'] as const).map(g => (
                <TouchableOpacity key={g} style={[styles.segment, prefGender === g && styles.segmentActive]} onPress={() => setPrefGender(g)}>
                  <Text style={[styles.segmentText, prefGender === g && styles.segmentTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { marginTop: 8 }]}>Age range {prefAgeMin}-{prefAgeMax}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mutedSmall}>Min</Text>
                <Slider
                  minimumValue={18}
                  maximumValue={prefAgeMax}
                  step={1}
                  value={prefAgeMin}
                  onValueChange={setPrefAgeMin}
                  minimumTrackTintColor="#cce6ff"
                  maximumTrackTintColor="#333"
                  thumbTintColor="#4da3ff"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mutedSmall}>Max</Text>
                <Slider
                  minimumValue={prefAgeMin}
                  maximumValue={99}
                  step={1}
                  value={prefAgeMax}
                  onValueChange={setPrefAgeMax}
                  minimumTrackTintColor="#cce6ff"
                  maximumTrackTintColor="#333"
                  thumbTintColor="#4da3ff"
                />
              </View>
            </View>
          </View>
          {/* Photos */}
          <Text style={styles.section}>Photos (exactly 6)</Text>
          <View style={[styles.card, { marginBottom: 10 }]}> 
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                placeholder="Paste image URL"
                placeholderTextColor="#777"
                style={[styles.input, { flex: 1 }]}
                value={newPhotoUrl}
                onChangeText={setNewPhotoUrl}
              />
              <TouchableOpacity style={[styles.addBtn, photos.length >= 6 && { opacity: 0.5 }]} onPress={addPhoto} disabled={photos.length >= 6}>
                <Ionicons name="add" size={18} color="#0a0a0a" />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, photos.length >= 6 && { opacity: 0.5 }]} onPress={pickAndUploadPhoto} disabled={photos.length >= 6}>
                <Ionicons name="image-outline" size={18} color="#0a0a0a" />
                <Text style={styles.addBtnText}>Pick</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, photos.length >= 6 && { opacity: 0.5 }]} onPress={captureAndUploadPhoto} disabled={photos.length >= 6}>
                <Ionicons name="camera" size={18} color="#0a0a0a" />
                <Text style={styles.addBtnText}>Camera</Text>
              </TouchableOpacity>
            </View>
          </View>
          {photos.length < 6 ? (
            <Text style={styles.mutedSmall}>Please add exactly 6 photos to complete your profile.</Text>
          ) : (
            <Text style={styles.mutedSmall}>You have added exactly 6 photos. Great job!</Text>
          )}
          <FlatList
            key={'photos-grid'}
            data={photos}
            keyExtractor={(item) => String(item.id)}
            numColumns={3}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={[styles.gridContent, { paddingBottom: 80 }]}
            renderItem={({ item }) => (
              <View style={[styles.gridItem, { width: '32%', aspectRatio: 1 }]}> 
                <Image source={{ uri: item.image_url }} style={styles.gridImage} />
                {editMode && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deletePhoto(item.id)}>
                    <View style={styles.deleteBtnBg}>
                      <Ionicons name="close" size={14} color="#fff" />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
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
  bottomBar: { position: 'absolute', left: 12, right: 12, bottom: 12, gap: 10 },
  editPrimaryBtn: { backgroundColor: '#1f1f1f', borderWidth: 1, borderColor: '#333', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  editPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
