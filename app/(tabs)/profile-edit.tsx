import React, { useMemo } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Animated, Pressable } from "react-native";
import Slider from "@react-native-community/slider";
import { Picker } from "@react-native-picker/picker";
import { useStore } from "@/store";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from 'expo-image-picker';

export default function ProfileEditScreen() {
  const { currentUser, resolvedThemeMode } = useStore();
  const theme = useMemo(() => {
    if (resolvedThemeMode === 'light') {
      return {
        bg: '#FFF5F8', text: '#1a1a1a', sub: '#6b5b61', muted: '#7d6a72',
        card: '#ffffff', border: '#f0cfd8', inputBg: '#ffffff', inputBorder: '#f0cfd8', placeholder: '#9b7f89',
        chipBg: '#fff', chipBorder: '#edd0d9', chipText: '#5a4e53',
        segmentBg: '#fff', segmentBorder: '#edd0d9', segmentActiveBg: '#ffe9f0', segmentActiveBorder: '#f4cdd8',
        btnBg: '#ffe9f0', btnText: '#000', btnBorder: '#f4cdd8',
        saveBg: '#ff5b80', saveText: '#fff',
        gridBorder: '#f0cfd8', overlay: 'rgba(0,0,0,0.6)',
        accent: '#ff5b80',
      } as const;
    }
    return {
      bg: '#0a0a0a', text: '#fff', sub: '#888', muted: '#9aa0a6',
      card: '#111', border: '#222', inputBg: '#0f0f10', inputBorder: '#222', placeholder: '#777',
      chipBg: '#1a1a1a', chipBorder: '#2a2a2d', chipText: '#ddd',
      segmentBg: '#0f0f10', segmentBorder: '#1f1f22', segmentActiveBg: '#1a2b3d', segmentActiveBorder: '#2a5b86',
      btnBg: '#fff', btnText: '#000', btnBorder: '#fff',
      saveBg: '#fff', saveText: '#000',
      gridBorder: '#222', overlay: 'rgba(0,0,0,0.6)',
      accent: '#4da3ff',
    } as const;
  }, [resolvedThemeMode]);
  const [profile, setProfile] = React.useState<any>(null);
  const [photos, setPhotos] = React.useState<Array<{ id: number; image_url: string }>>([]);
  const [saving, setSaving] = React.useState(false);
  const [busyPhotoIds, setBusyPhotoIds] = React.useState<Set<number>>(new Set());
  const PHOTOS_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_PHOTOS_BUCKET || 'profile-photos';
  const [prefGender, setPrefGender] = React.useState<'all' | 'male' | 'female' | 'non-binary' | 'other'>('all');
  const [prefAgeMin, setPrefAgeMin] = React.useState(18);
  const [prefAgeMax, setPrefAgeMax] = React.useState(99);
  const [dobYear, setDobYear] = React.useState<string>('');
  const [dobMonth, setDobMonth] = React.useState<string>('');
  const [dobDay, setDobDay] = React.useState<string>('');
  const [interestNames, setInterestNames] = React.useState<string[]>([]);

  const load = React.useCallback(async () => {
    if (!currentUser?.id) return;
    const [{ data: p }, { data: ph }, { data: ui }] = await Promise.all([
      supabase.from('profiles').select('id, name, bio, gender, date_of_birth, location, religion').eq('id', currentUser.id).maybeSingle(),
      supabase.from('photos').select('id, image_url').eq('user_id', currentUser.id).order('created_at', { ascending: false }),
      supabase.from('user_interests').select('interest_id, interests(name)').eq('user_id', currentUser.id)
    ]);
    setProfile((p as any) || null);
    setPhotos((ph as any[]) || []);
    const names = ((ui as any[]) || []).map((r: any) => r?.interests?.name).filter((n: any) => typeof n === 'string');
    setInterestNames(names);
    const iso = (p as any)?.date_of_birth as string | null;
    if (iso) {
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        setDobYear(String(d.getFullYear()));
        setDobMonth(String(d.getMonth() + 1));
        setDobDay(String(d.getDate()));
      }
    }
  }, [currentUser?.id]);

  React.useEffect(() => { load(); }, [load]);

  const saveProfile = async () => {
    if (!profile || !currentUser?.id) return;
    setSaving(true);
    const payload: any = {
      id: currentUser.id,
      name: profile.name || 'User',
      bio: profile.bio ?? null,
      gender: profile.gender ?? null,
      date_of_birth: profile.date_of_birth ?? null,
      location: profile.location ?? null,
      religion: profile.religion ?? null,
    };
    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await load();
      router.push('/(tabs)/profile-view' as any);
    }
    setSaving(false);
  };

  const pickFromLibrary = async () => {
    try {
      if (photos.length >= 4) { Alert.alert('Limit', 'You can upload exactly 4 photos.'); return; }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission', 'Photo library permission is required.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      await uploadAndInsert(result.assets[0].uri);
    } catch (e: any) { Alert.alert('Pick failed', e?.message || 'Please try again.'); }
  };

  const takePhoto = async () => {
    try {
      if (photos.length >= 4) { Alert.alert('Limit', 'You can upload exactly 4 photos.'); return; }
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission', 'Camera permission is required.'); return; }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      await uploadAndInsert(result.assets[0].uri);
    } catch (e: any) { Alert.alert('Capture failed', e?.message || 'Please try again.'); }
  };

  const uploadAndInsert = async (uri: string) => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(uri);
      const arrayBuffer = await res.arrayBuffer();
      const lower = uri.toLowerCase();
      let ext = 'jpg';
      if (lower.includes('.png')) ext = 'png';
      else if (lower.includes('.webp')) ext = 'webp';
      else if (lower.includes('.heic')) ext = 'heic';
      else if (lower.includes('.heif')) ext = 'heif';
      const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'heic' ? 'image/heic' : ext === 'heif' ? 'image/heif' : 'image/jpeg';
      const filename = `${currentUser.id}/${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(PHOTOS_BUCKET).upload(filename, arrayBuffer, { contentType, upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(filename);
      const publicUrl = data.publicUrl;
      const { error: insErr } = await supabase.from('photos').insert({ user_id: currentUser.id, image_url: publicUrl });
      if (insErr) throw insErr;
      await load();
    } catch (e: any) { Alert.alert('Upload failed', e?.message || 'Please try again.'); }
  };

  const deletePhoto = async (photoId: number) => {
    Alert.alert('Delete photo', 'Remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setBusyPhotoIds(prev => new Set(prev).add(photoId));
        const { error } = await supabase.from('photos').delete().eq('id', photoId);
        if (error) Alert.alert('Error', error.message); else await load();
        setBusyPhotoIds(prev => { const n = new Set(prev); n.delete(photoId); return n; });
      }}
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={{ padding: 12, paddingBottom: 120 }}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>About</Text>
        <Text style={styles.label}>Religion</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {RELIGIONS.map(r => (
            <Chip
              key={r.key}
              label={r.label}
              active={(profile?.religion || '').toLowerCase() === r.key}
              onPress={() => setProfile((p: any) => ({ ...(p || {}), religion: r.label }))}
            />
          ))}
        </View>
        <TextInput
          placeholder="Your bio"
          placeholderTextColor={theme.placeholder}
          style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}
          multiline
          value={profile?.bio ?? ''}
          onChangeText={(t) => setProfile((p: any) => ({ ...(p || {}), bio: t }))}
        />
        <Text style={styles.label}>Location</Text>
        <TextInput
          placeholder="City"
          placeholderTextColor={theme.placeholder}
          style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}
          value={profile?.location ?? ''}
          onChangeText={(t) => setProfile((p: any) => ({ ...(p || {}), location: t }))}
        />
        <Text style={styles.label}>Gender</Text>
        <View style={styles.segmentRow}>
          {(['male','female','non-binary','other'] as const).map(g => (
            <TouchableOpacity key={g} style={[styles.segment, { backgroundColor: theme.segmentBg, borderColor: theme.segmentBorder }, profile?.gender === g && { backgroundColor: theme.segmentActiveBg, borderColor: theme.segmentActiveBorder }]} onPress={() => setProfile((p: any) => ({ ...(p || {}), gender: g }))}>
              <Text style={[styles.segmentText, { color: theme.muted }, profile?.gender === g && { color: resolvedThemeMode === 'light' ? '#000' : '#cce6ff' }]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Date of birth</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Picker selectedValue={dobDay} onValueChange={(v) => { setDobDay(String(v)); setProfile((p: any) => ({ ...(p || {}), date_of_birth: `${dobYear}-${String(dobMonth).padStart(2,'0')}-${String(v).padStart(2,'0')}`})); }} style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.inputBorder }] as any}>
              <Picker.Item label="Day" value="" />
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <Picker.Item key={d} label={String(d)} value={String(d)} />
              ))}
            </Picker>
          </View>
          <View style={{ flex: 1 }}>
            <Picker selectedValue={dobMonth} onValueChange={(v) => { setDobMonth(String(v)); setProfile((p: any) => ({ ...(p || {}), date_of_birth: `${dobYear}-${String(v).padStart(2,'0')}-${String(dobDay).padStart(2,'0')}`})); }} style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.inputBorder }] as any}>
              <Picker.Item label="Month" value="" />
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <Picker.Item key={m} label={String(m)} value={String(m)} />
              ))}
            </Picker>
          </View>
          <View style={{ flex: 1.3 }}>
            <Picker selectedValue={dobYear} onValueChange={(v) => { setDobYear(String(v)); setProfile((p: any) => ({ ...(p || {}), date_of_birth: `${String(v)}-${String(dobMonth).padStart(2,'0')}-${String(dobDay).padStart(2,'0')}`})); }} style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.inputBorder }] as any}>
              <Picker.Item label="Year" value="" />
              {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <Picker.Item key={y} label={String(y)} value={String(y)} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Interests</Text>
        {interestNames.length === 0 ? (
          <Text style={[styles.mutedSmall, { color: theme.muted }]}>You haven't added any interests yet.</Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
            {interestNames.map((n) => (
              <View key={n} style={[styles.interestChip, { backgroundColor: theme.chipBg, borderColor: theme.chipBorder }] }>
                <Ionicons name={interestIcon(n) as any} size={14} color={resolvedThemeMode === 'light' ? '#8a7c83' : '#bbb'} style={{ marginRight: 6 }} />
                <Text style={[styles.interestChipText, { color: resolvedThemeMode === 'light' ? theme.chipText : '#ddd' }]}>{n}</Text>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity style={[styles.btn, { marginTop: 10, alignSelf: 'flex-start', backgroundColor: theme.btnBg, borderWidth: 1, borderColor: theme.btnBorder }]} onPress={() => router.push('/(tabs)/interests' as any)}>
          <Ionicons name="add-outline" size={16} color={theme.btnText} />
          <Text style={[styles.btnText, { color: theme.btnText }]}>Edit interests</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Discovery preferences</Text>
        <Text style={styles.label}>Show me</Text>
        <View style={styles.segmentRow}>
          {(['all','male','female','non-binary','other'] as const).map(g => (
            <TouchableOpacity key={g} style={[styles.segment, { backgroundColor: theme.segmentBg, borderColor: theme.segmentBorder }, prefGender === g && { backgroundColor: theme.segmentActiveBg, borderColor: theme.segmentActiveBorder }]} onPress={() => setPrefGender(g)}>
              <Text style={[styles.segmentText, { color: theme.muted }, prefGender === g && { color: resolvedThemeMode === 'light' ? '#000' : '#cce6ff' }]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, { marginTop: 8 }]}>Age range {prefAgeMin}-{prefAgeMax}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.mutedSmall, { color: theme.muted }]}>Min</Text>
            <Slider minimumValue={18} maximumValue={prefAgeMax} step={1} value={prefAgeMin} onValueChange={setPrefAgeMin} minimumTrackTintColor={resolvedThemeMode === 'light' ? theme.accent : '#4da3ff'} maximumTrackTintColor={resolvedThemeMode === 'light' ? theme.border : '#333'} thumbTintColor={resolvedThemeMode === 'light' ? theme.accent : '#4da3ff'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.mutedSmall, { color: theme.muted }]}>Max</Text>
            <Slider minimumValue={prefAgeMin} maximumValue={99} step={1} value={prefAgeMax} onValueChange={setPrefAgeMax} minimumTrackTintColor={resolvedThemeMode === 'light' ? theme.accent : '#4da3ff'} maximumTrackTintColor={resolvedThemeMode === 'light' ? theme.border : '#333'} thumbTintColor={resolvedThemeMode === 'light' ? theme.accent : '#4da3ff'} />
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Photos (exactly 4)</Text>
        <Text style={[styles.mutedSmall, { color: theme.muted }]}>Photos added: {photos.length}/4</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.btnBg, borderWidth: 1, borderColor: theme.btnBorder }]} onPress={pickFromLibrary} disabled={photos.length >= 4}>
            <Ionicons name="image-outline" size={16} color={theme.btnText} />
            <Text style={[styles.btnText, { color: theme.btnText }]}>Pick</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.btnBg, borderWidth: 1, borderColor: theme.btnBorder }]} onPress={takePhoto} disabled={photos.length >= 4}>
            <Ionicons name="camera" size={16} color={theme.btnText} />
            <Text style={[styles.btnText, { color: theme.btnText }]}>Camera</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
          {photos.map((p) => (
            <View key={p.id} style={{ width: '31%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: theme.gridBorder, position: 'relative' }}>
              <Image source={{ uri: p.image_url }} style={{ width: '100%', height: '100%' }} />
              <TouchableOpacity style={styles.remove} onPress={() => deletePhoto(p.id)} disabled={busyPhotoIds.has(p.id)}>
                {busyPhotoIds.has(p.id) ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>X</Text>}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.saveBg }, saving && { opacity: 0.6 }]} onPress={saveProfile} disabled={saving}>
        <Text style={[styles.saveBtnText, { color: theme.saveText }]}>{saving ? 'Saving…' : 'Save'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { backgroundColor: '#111', borderColor: '#222', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  cardTitle: { color: '#fff', fontWeight: '700', marginBottom: 6 },
  input: { color: '#fff', backgroundColor: '#0f0f10', borderWidth: 1, borderColor: '#222', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  label: { color: '#ddd', fontSize: 13, marginTop: 8, marginBottom: 6, fontWeight: '600' },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: { backgroundColor: '#0f0f10', borderWidth: 1, borderColor: '#1f1f22', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  segmentActive: { backgroundColor: '#1a2b3d', borderColor: '#2a5b86' },
  segmentText: { color: '#9aa0a6', fontSize: 12, fontWeight: '700' },
  segmentTextActive: { color: '#cce6ff' },
  mutedSmall: { color: '#888', fontSize: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  btnText: { color: '#000', fontWeight: '800' },
  saveBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  saveBtnText: { color: '#000', fontWeight: '800' },
  remove: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  interestChip: { backgroundColor: '#1a1a1a', borderColor: '#2a2a2d', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, flexDirection: 'row', alignItems: 'center' },
  interestChipText: { color: '#ddd', fontWeight: '600' },
});

const RELIGIONS = [
  { key: 'hindu', label: 'Hindu' },
  { key: 'muslim', label: 'Muslim' },
  { key: 'christian', label: 'Christianity' },
  { key: 'sikh', label: 'Sikh' },
  { key: 'buddhist', label: 'Buddhist' },
  { key: 'jain', label: 'Jain' },
  { key: 'jewish', label: 'Jewish' },
  { key: 'spiritual', label: 'Spiritual' },
  { key: 'agnostic', label: 'Agnostic' },
  { key: 'atheist', label: 'Atheist' },
];

function interestIcon(name: string): keyof typeof Ionicons.glyphMap {
  const n = name.toLowerCase();
  if (/(music|rock|pop|hip|edm|indie|classical)/.test(n)) return 'musical-notes-outline';
  if (/(movie|series|bollywood|hollywood|anime|comics)/.test(n)) return 'film-outline';
  if (/(cricket|football|badminton|chess|sport)/.test(n)) return 'trophy-outline';
  if (/(fitness|yoga|run|cycle|hiking|hike)/.test(n)) return 'barbell-outline';
  if (/(photo|photography|camera)/.test(n)) return 'camera-outline';
  if (/(coffee|tea|baking|cook|vegan|bbq)/.test(n)) return 'restaurant-outline';
  if (/(read|writing|poetry|learn|self|startup|tech)/.test(n)) return 'book-outline';
  if (/(travel|trip|backpack|beach|mountain|camp)/.test(n)) return 'airplane-outline';
  if (/(volunteer|pet|board|nightlife)/.test(n)) return 'sparkles-outline' as any;
  return 'pricetag-outline';
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { resolvedThemeMode } = useStore();
  const chip = React.useMemo(() => {
    if (resolvedThemeMode === 'light') {
      return {
        bg: '#fff', border: '#edd0d9', text: '#5a4e53', icon: '#8a7c83', activeBg: '#ffe9f0', activeBorder: '#f4cdd8', activeText: '#1a1a1a'
      } as const;
    }
    return { bg: '#0f0f10', border: '#222', text: '#c7c7c7', icon: '#bbb', activeBg: '#141416', activeBorder: '#fff', activeText: '#fff' } as const;
  }, [resolvedThemeMode]);
  const scale = React.useRef(new Animated.Value(1)).current;
  const onIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, friction: 6 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  return (
    <Pressable onPressIn={onIn} onPressOut={onOut} onPress={onPress} style={{ borderRadius: 18 }}>
      <Animated.View style={[{ backgroundColor: chip.bg, borderColor: chip.border, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 18, flexDirection: 'row', alignItems: 'center' }, active && { borderColor: chip.activeBorder, backgroundColor: chip.activeBg }, { transform: [{ scale }] }]}> 
        <Ionicons name="book-outline" size={14} color={active ? chip.activeText : chip.icon} style={{ marginRight: 6 }} />
        <Text style={[{ color: chip.text, fontWeight: '700' }, active && { color: chip.activeText }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}
