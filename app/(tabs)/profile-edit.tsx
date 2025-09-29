import React, { useMemo } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Animated, Pressable, Platform, Modal } from "react-native";
// import Slider from "@react-native-community/slider";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from "@/store";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function ProfileEditScreen() {
  const { currentUser, resolvedThemeMode, updateProfile } = useStore();
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
  // Discovery preferences removed
  // const [prefGender, setPrefGender] = React.useState<'all' | 'male' | 'female' | 'non-binary' | 'other'>('all');
  // const [prefAgeMin, setPrefAgeMin] = React.useState(18);
  // const [prefAgeMax, setPrefAgeMax] = React.useState(99);
  const [dobYear, setDobYear] = React.useState<string>('');
  const [dobMonth, setDobMonth] = React.useState<string>('');
  const [dobDay, setDobDay] = React.useState<string>('');
  const [dobValue, setDobValue] = React.useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = React.useState(false);
  const [interestNames, setInterestNames] = React.useState<string[]>([]);
  const [selectedInterestIds, setSelectedInterestIds] = React.useState<number[]>([]);
  const [allInterests, setAllInterests] = React.useState<Array<{ id: number; name: string }>>([]);
  const [loadingInterests, setLoadingInterests] = React.useState(false);
  const [showInterestsDropdown, setShowInterestsDropdown] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!currentUser?.id) return;
    const [{ data: p }, { data: ph }, { data: ui }] = await Promise.all([
      supabase.from('profiles').select('id, name, bio, gender, date_of_birth, location, religion').eq('id', currentUser.id).maybeSingle(),
      supabase.from('photos').select('id, image_url').eq('user_id', currentUser.id).order('created_at', { ascending: false }),
      supabase.from('user_interests').select('interest_id, interests(name)').eq('user_id', currentUser.id)
    ]);
    setProfile((p as any) || null);
    setPhotos((ph as any[]) || []);
    const uiRows = ((ui as any[]) || []);
    const names = uiRows.map((r: any) => r?.interests?.name).filter((n: any) => typeof n === 'string');
    const ids = uiRows.map((r: any) => r?.interest_id).filter((n: any) => typeof n === 'number');
    setInterestNames(names);
    setSelectedInterestIds(ids);
    const iso = (p as any)?.date_of_birth as string | null;
    if (iso) {
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        setDobYear(String(d.getFullYear()));
        setDobMonth(String(d.getMonth() + 1));
        setDobDay(String(d.getDate()));
        setDobValue(d);
      }
    } else {
      setDobValue(null);
    }
  }, [currentUser?.id]);

  React.useEffect(() => { load(); }, [load]);

  // Load catalog of interests
  const loadAllInterests = React.useCallback(async () => {
    try {
      setLoadingInterests(true);
      const { data, error } = await supabase.from('interests').select('id, name').order('name');
      if (error) throw error;
      setAllInterests((data as any[]) || []);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load interests');
    } finally {
      setLoadingInterests(false);
    }
  }, []);

  const toggleInterestsDropdown = async () => {
    setShowInterestsDropdown((prev) => !prev);
    if (!showInterestsDropdown && allInterests.length === 0) {
      await loadAllInterests();
    }
  };

  const toggleInterest = async (interest: { id: number; name: string }) => {
    if (!currentUser?.id) return;
    const exists = selectedInterestIds.includes(interest.id);
    if (exists) {
      // optimistic remove
      setSelectedInterestIds((ids) => ids.filter((i) => i !== interest.id));
      setInterestNames((names) => names.filter((n) => n !== interest.name));
      const { error } = await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('interest_id', interest.id);
      if (error) {
        // revert
        setSelectedInterestIds((ids) => [...ids, interest.id]);
        setInterestNames((names) => [...names, interest.name]);
        Alert.alert('Error', error.message);
      }
    } else {
      // optimistic add
      setSelectedInterestIds((ids) => [...ids, interest.id]);
      setInterestNames((names) => [...names, interest.name].sort((a, b) => a.localeCompare(b)));
      const { error } = await supabase
        .from('user_interests')
        .insert({ user_id: currentUser.id, interest_id: interest.id });
      if (error) {
        // revert
        setSelectedInterestIds((ids) => ids.filter((i) => i !== interest.id));
        setInterestNames((names) => names.filter((n) => n !== interest.name));
        Alert.alert('Error', error.message);
      }
    }
  };

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

  // Reorder a photo within the local array (UI-only)
  // (Shuffle removed; using drag-and-drop instead)

  // On first load with photos, set first as main avatar once
  const autoSetMainRef = React.useRef(false);
  React.useEffect(() => {
    if (!autoSetMainRef.current && photos && photos.length > 0) {
      autoSetMainRef.current = true;
      const first = photos[0];
      if (first?.image_url) updateProfile({ avatarUri: first.image_url }).catch(() => {});
    }
  }, [photos.length]);
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

  // Derive storage object path from a public URL
  const storagePathFromPublicUrl = (publicUrl: string, bucket: string): string | null => {
    // Expected format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return publicUrl.substring(idx + marker.length);
  };

  const deletePhoto = async (photoId: number) => {
    Alert.alert('Delete photo', 'Remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setBusyPhotoIds(prev => new Set(prev).add(photoId));
        try {
          // Find photo URL locally to compute storage path
          const photo = photos.find(p => p.id === photoId);
          const imageUrl = photo?.image_url;
          const storagePath = imageUrl ? storagePathFromPublicUrl(imageUrl, PHOTOS_BUCKET) : null;
          if (storagePath) {
            // Best-effort storage deletion first
            const { error: rmErr } = await supabase.storage.from(PHOTOS_BUCKET).remove([storagePath]);
            // If file already missing, ignore
            if (rmErr && !String(rmErr.message || rmErr).toLowerCase().includes('not found')) {
              // Still proceed to remove DB row, but inform user
              console.warn('Storage remove failed:', rmErr);
            }
          }
          // Remove DB row
          const { error } = await supabase.from('photos').delete().eq('id', photoId);
          if (error) {
            Alert.alert('Error', error.message);
          } else {
            await load();
          }
        } finally {
          setBusyPhotoIds(prev => { const n = new Set(prev); n.delete(photoId); return n; });
        }
      }}
    ]);
  };

  // (Removed movePhoto/makeMain per request)


  // Auto-set first image as main avatar once when photos load
  const autoSetMainRef = React.useRef(false);
  React.useEffect(() => {
    if (!autoSetMainRef.current && photos && photos.length > 0) {
      autoSetMainRef.current = true;
      const first = photos[0];
      if (first?.image_url) updateProfile({ avatarUri: first.image_url }).catch(() => {});
    }
  }, [photos.length]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
        {/* Gender section removed */}
        <Text style={styles.label}>Date of birth</Text>
        {Platform.OS === 'web' ? (
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
                {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 18 - i).map(y => (
                  <Picker.Item key={y} label={String(y)} value={String(y)} />
                ))}
              </Picker>
            </View>
          </View>
        ) : (
          <View>
            <TouchableOpacity onPress={() => setShowDobPicker(true)} style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <Text style={{ color: theme.text }}>
                {dobValue ? `${String(dobValue.getFullYear())}-${String(dobValue.getMonth()+1).padStart(2,'0')}-${String(dobValue.getDate()).padStart(2,'0')}` : 'Select date'}
              </Text>
              <Ionicons name="calendar-outline" size={16} color={theme.placeholder} />
            </TouchableOpacity>
            {showDobPicker && (
              Platform.OS === 'ios' ? (
                <Modal transparent animationType="slide" onRequestClose={() => setShowDobPicker(false)}>
                  <View style={styles.modalBackdrop}>
                    <View style={[styles.modalSheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowDobPicker(false)}>
                          <Text style={[styles.modalHeaderBtn, { color: resolvedThemeMode === 'light' ? '#000' : '#cce6ff' }]}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Select date</Text>
                        <TouchableOpacity onPress={() => setShowDobPicker(false)}>
                          <Text style={[styles.modalHeaderBtn, { color: resolvedThemeMode === 'light' ? '#000' : '#cce6ff' }]}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        testID="dobPicker"
                        value={dobValue || new Date(2000, 0, 1)}
                        mode="date"
                        display={'spinner'}
                        themeVariant={resolvedThemeMode === 'light' ? 'light' : 'dark'}
                        textColor={resolvedThemeMode === 'light' ? '#000' : '#fff'}
                        style={{ backgroundColor: resolvedThemeMode === 'light' ? '#fff' : '#000' }}
                        maximumDate={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate())}
                        minimumDate={new Date(new Date().getFullYear() - 100, 0, 1)}
                        onChange={(event: any, selected?: Date) => {
                          if (!selected) return;
                          setDobValue(selected);
                          const y = selected.getFullYear();
                          const m = selected.getMonth() + 1;
                          const d = selected.getDate();
                          setDobYear(String(y));
                          setDobMonth(String(m));
                          setDobDay(String(d));
                          const iso = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                          setProfile((p: any) => ({ ...(p || {}), date_of_birth: iso }));
                        }}
                      />
                    </View>
                  </View>
                </Modal>
              ) : (
                <DateTimePicker
                  testID="dobPicker"
                  value={dobValue || new Date(2000, 0, 1)}
                  mode="date"
                  display={'spinner'}
                  maximumDate={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate())}
                  minimumDate={new Date(new Date().getFullYear() - 100, 0, 1)}
                  onChange={(event: any, selected?: Date) => {
                    const type = (event && event.type) || undefined;
                    if (type === 'dismissed') { setShowDobPicker(false); return; }
                    if (type === 'set') { setShowDobPicker(false); }
                    if (!selected) return;
                    setDobValue(selected);
                    const y = selected.getFullYear();
                    const m = selected.getMonth() + 1;
                    const d = selected.getDate();
                    setDobYear(String(y));
                    setDobMonth(String(m));
                    setDobDay(String(d));
                    const iso = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    setProfile((p: any) => ({ ...(p || {}), date_of_birth: iso }));
                  }}
                />
              )
            )}
          </View>
        )}
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
        <TouchableOpacity style={[styles.btn, { marginTop: 10, alignSelf: 'flex-start', backgroundColor: theme.btnBg, borderWidth: 1, borderColor: theme.btnBorder }]} onPress={toggleInterestsDropdown}>
          <Ionicons name="add-outline" size={16} color={theme.btnText} />
          <Text style={[styles.btnText, { color: theme.btnText }]}>{showInterestsDropdown ? 'Close interests' : 'Edit interests'}</Text>
        </TouchableOpacity>
        {showInterestsDropdown && (
          <View style={{ marginTop: 10, borderWidth: 1, borderColor: theme.border, borderRadius: 10, backgroundColor: theme.card }}>
            {loadingInterests ? (
              <View style={{ padding: 12, alignItems: 'center' }}>
                <ActivityIndicator color={resolvedThemeMode === 'light' ? '#000' : '#fff'} />
              </View>
            ) : (
              <View>
                {allInterests.map((it) => {
                  const selected = selectedInterestIds.includes(it.id);
                  return (
                    <TouchableOpacity key={it.id} onPress={() => toggleInterest(it)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
                      <Text style={{ color: theme.text, fontWeight: '600' }}>{it.name}</Text>
                      <Ionicons name={selected ? 'checkbox-outline' : 'square-outline'} size={18} color={selected ? theme.accent : theme.muted} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Discovery preferences removed */}

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
        <View style={{ marginTop: 12 }}>
          <DraggableFlatList
            data={photos}
            keyExtractor={(item) => String(item.id)}
            numColumns={2}
            activationDistance={12}
            onDragEnd={({ data }) => {
              setPhotos(data);
              if (data[0]?.image_url) updateProfile({ avatarUri: data[0].image_url }).catch(() => {});
            }}
            containerStyle={{}}
            contentContainerStyle={{}}
            scrollEnabled={false}
            renderItem={({ item, getIndex, drag, isActive }: RenderItemParams<{ id: number; image_url: string }>) => {
              const idx = getIndex?.() ?? 0;
              return (
                <Pressable onLongPress={drag} disabled={isActive} style={{ flex: 1, margin: 6, aspectRatio: 1, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: theme.gridBorder, position: 'relative' }}>
                  <Image source={{ uri: item.image_url }} style={{ width: '100%', height: '100%', opacity: isActive ? 0.9 : 1 }} />
                  {idx === 0 && (
                    <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>MAIN</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.remove} onPress={() => deletePhoto(item.id)} disabled={busyPhotoIds.has(item.id)}>
                    {busyPhotoIds.has(item.id) ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>X</Text>}
                  </TouchableOpacity>
                </Pressable>
              );
            }}
          />
        </View>
      </View>

      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.saveBg }, saving && { opacity: 0.6 }]} onPress={saveProfile} disabled={saving}>
        <Text style={[styles.saveBtnText, { color: theme.saveText }]}>{saving ? 'Saving…' : 'Save'}</Text>
      </TouchableOpacity>
      </ScrollView>
    </GestureHandlerRootView>
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, padding: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 },
  modalHeaderBtn: { fontWeight: '700' },
  modalTitle: { fontWeight: '800' },
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
