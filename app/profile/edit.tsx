import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, Platform, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '@/store';
import { router } from 'expo-router';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, updateProfile } = useStore();

  const [name, setName] = useState<string>(currentUser.name || '');
  const [avatarUri, setAvatarUri] = useState<string | null | undefined>(currentUser.avatar);
  const [bio, setBio] = useState<string>('');
  const [dob, setDob] = useState<string>(''); // YYYY-MM-DD
  const [location, setLocation] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [dobValue, setDobValue] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);

  // Initialize dobValue from dob string if available
  React.useEffect(() => {
    if (dob && !dobValue) {
      const d = new Date(dob);
      if (!isNaN(d.getTime())) setDobValue(d);
    }
  }, [dob]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need photo library permission to pick an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const clearAvatar = () => setAvatarUri(null);

  const onSave = async () => {
    if (!name?.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    setIsSaving(true);
    try {
      // updateProfile currently supports name and avatar upload. We'll persist bio/gender/dob/location in Profile tab save.
      const res = await updateProfile({ name: name.trim(), avatarUri });
      if (!res.ok) {
        Alert.alert('Error', res.reason || 'Failed to update profile.');
      } else {
        router.back();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Unexpected error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Text style={styles.heading}>Edit Profile</Text>

        {/* Avatar */}
        <View style={styles.avatarRow}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={28} color="#888" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={styles.avatarActionsRow}>
              <TouchableOpacity style={styles.btn} onPress={pickImage}>
                <Ionicons name="image-outline" size={16} color="#4da3ff" />
                <Text style={styles.btnText}>Change Photo</Text>
              </TouchableOpacity>
              {avatarUri && (
                <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={clearAvatar}>
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                  <Text style={styles.btnDangerText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.hint}>Use a clear photo so buyers can recognize you.</Text>
          </View>
        </View>

        {/* Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            placeholder="Your name"
            placeholderTextColor="#888"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Bio, Gender, DOB, Location (basic inputs to stage values; saving is currently done in main profile screen) */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            placeholder="Tell something about you"
            placeholderTextColor="#888"
            style={[styles.input, { minHeight: 80 }]}
            multiline
            value={bio}
            onChangeText={setBio}
          />
        </View>
        {/* Gender field removed */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Date of birth</Text>
          {Platform.OS === 'web' ? (
            <TextInput
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#888"
              style={styles.input}
              value={dob}
              onChangeText={setDob}
            />
          ) : (
            <View>
              <TouchableOpacity
                onPress={() => setShowDobPicker(true)}
                style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              >
                <Text style={{ color: '#fff' }}>
                  {dobValue ? `${String(dobValue.getFullYear())}-${String(dobValue.getMonth()+1).padStart(2,'0')}-${String(dobValue.getDate()).padStart(2,'0')}` : 'Select date'}
                </Text>
                <Ionicons name="calendar-outline" size={16} color="#888" />
              </TouchableOpacity>
              {showDobPicker && (
                Platform.OS === 'ios' ? (
                  <Modal transparent animationType="slide" onRequestClose={() => setShowDobPicker(false)}>
                    <View style={styles.modalBackdrop}>
                      <View style={[styles.modalSheet, { backgroundColor: '#111', borderColor: '#222' }]}>
                        <View style={styles.modalHeader}>
                          <TouchableOpacity onPress={() => setShowDobPicker(false)}>
                            <Text style={[styles.modalHeaderBtn, { color: '#cce6ff' }]}>Cancel</Text>
                          </TouchableOpacity>
                          <Text style={[styles.modalTitle, { color: '#fff' }]}>Select date</Text>
                          <TouchableOpacity onPress={() => setShowDobPicker(false)}>
                            <Text style={[styles.modalHeaderBtn, { color: '#cce6ff' }]}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          testID="dobPicker"
                          value={dobValue || new Date(2000, 0, 1)}
                          mode="date"
                          display={'spinner'}
                          themeVariant={'dark'}
                          textColor={'#fff'}
                          style={{ backgroundColor: '#000', height: 216 }}
                          maximumDate={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate())}
                          minimumDate={new Date(new Date().getFullYear() - 100, 0, 1)}
                          onChange={(event: any, selected?: Date) => {
                            if (!selected) return;
                            setDobValue(selected);
                            const y = selected.getFullYear();
                            const m = selected.getMonth() + 1;
                            const d = selected.getDate();
                            const iso = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                            setDob(iso);
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
                    display={'calendar'}
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
                      const iso = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                      setDob(iso);
                    }}
                  />
                )
              )}
            </View>
          )}
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            placeholder="City"
            placeholderTextColor="#888"
            style={styles.input}
            value={location}
            onChangeText={setLocation}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#0a0a0a" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 16 },
  heading: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 16 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#111', marginRight: 12 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  hint: { color: '#888', fontSize: 12 },
  formGroup: { marginBottom: 16 },
  label: { color: '#ddd', marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: '#111', borderColor: '#222', borderWidth: 1, borderRadius: 10, padding: 12, color: '#fff' },
  pill: { backgroundColor: '#0f0f10', borderWidth: 1, borderColor: '#1f1f22', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  pillActive: { backgroundColor: '#1a2b3d', borderColor: '#2a5b86' },
  pillText: { color: '#9aa0a6', fontSize: 12, fontWeight: '700' },
  pillTextActive: { color: '#cce6ff' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#4da3ff', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  btnText: { color: '#4da3ff', fontWeight: '600' },
  btnDanger: { backgroundColor: '#cc3333', borderColor: '#cc3333' },
  btnDangerText: { color: '#fff', fontWeight: '600' },
  saveBtn: { backgroundColor: '#4da3ff', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled: { backgroundColor: '#2b5e91' },
  saveBtnText: { color: '#0a0a0a', fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, padding: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 },
  modalHeaderBtn: { fontWeight: '700' },
  modalTitle: { fontWeight: '800' },
});
