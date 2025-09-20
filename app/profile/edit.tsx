import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/store';
import { router } from 'expo-router';

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, updateProfile } = useStore();

  const [name, setName] = useState<string>(currentUser.name || '');
  const [avatarUri, setAvatarUri] = useState<string | null | undefined>(currentUser.avatar);
  const [phone, setPhone] = useState<string>(currentUser.phone || '');
  const [isSaving, setIsSaving] = useState(false);

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
    // Normalize and validate phone: default to +91 if no country code provided
    const rawPhone = phone.trim();
    let normalizedPhone: string | undefined = undefined;
    if (rawPhone) {
      if (rawPhone.startsWith('+')) {
        const digits = rawPhone.slice(1).replace(/\D+/g, '');
        normalizedPhone = '+' + digits;
      } else {
        const digits = rawPhone.replace(/\D+/g, '');
        // Default to India country code
        normalizedPhone = '+91' + digits;
      }
      if (!/^\+\d{7,15}$/.test(normalizedPhone)) {
        Alert.alert('Invalid phone number', 'Enter a valid number. If you omit country code, we will default to +91.');
        return;
      }
    }
    setIsSaving(true);
    try {
      const res = await updateProfile({ name: name.trim(), phone: normalizedPhone || undefined, avatarUri });
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

        {/* Phone */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone number (WhatsApp)</Text>
          <TextInput
            placeholder="e.g. +91 98765 43210"
            placeholderTextColor="#888"
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
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
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#4da3ff', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  btnText: { color: '#4da3ff', fontWeight: '600' },
  btnDanger: { backgroundColor: '#cc3333', borderColor: '#cc3333' },
  btnDangerText: { color: '#fff', fontWeight: '600' },
  saveBtn: { backgroundColor: '#4da3ff', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled: { backgroundColor: '#2b5e91' },
  saveBtnText: { color: '#0a0a0a', fontWeight: '800' },
});
