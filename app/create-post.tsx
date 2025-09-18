import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { createPlaceAndPost } from '@/lib/posts';

export default function CreatePost() {
  const colors = useThemeColors();
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onPickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      exif: false,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const onSubmit = async () => {
    if (!imageUri) {
      Alert.alert('Missing photo', 'Please take a photo first.');
      return;
    }
    setSubmitting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const created = await createPlaceAndPost({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        imageUri,
      });
      Alert.alert('Post created', 'Your place and post have been created.');
      router.replace(`/post/${created.id}`);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[styles.title, { color: colors.text }]}>Create Post</Text>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.preview} />
      ) : (
        <View style={[styles.preview, { backgroundColor: colors.icon + '22' }]} />
      )}

      <View style={styles.row}>
        <TouchableOpacity disabled={submitting} onPress={onPickImage} style={[styles.button, { backgroundColor: colors.tint }]}>
          <Text style={[styles.buttonText, { color: colors.mode === 'dark' ? '#000' : '#fff' }]}>Pick/Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={submitting} onPress={onSubmit} style={[styles.button, { backgroundColor: colors.tint }]}>
          {submitting ? (
            <ActivityIndicator color={colors.mode === 'dark' ? '#000' : '#fff'} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.mode === 'dark' ? '#000' : '#fff' }]}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  preview: { width: '100%', aspectRatio: 4/3, borderRadius: 12 },
  row: { flexDirection: 'row', gap: 12 },
  button: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
