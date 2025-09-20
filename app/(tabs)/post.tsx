import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Image, Platform, KeyboardAvoidingView } from "react-native";
import { useStore } from "@/store";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

const CONDITIONS = [
  'New',
  'Like New',
  'Good',
  'Fair',
  'Poor'
] as const;
type Condition = typeof CONDITIONS[number];

const CATEGORIES = [
  'Electronics',
  'Furniture',
  'Books',
  'Clothing',
  'Other'
];

export default function PostScreen() {
  const { createPost } = useStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<Condition>(CONDITIONS[0]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [imageUri, setImageUri] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const extractGpsFromExif = (exif: any): { lat?: number; lon?: number } => {
    if (!exif) return {};
    // Common cases across platforms
    const gpsObj = exif["{GPS}"];
    const lat1 = typeof exif.GPSLatitude === "number" ? exif.GPSLatitude : gpsObj?.Latitude;
    const lon1 = typeof exif.GPSLongitude === "number" ? exif.GPSLongitude : gpsObj?.Longitude;
    if (typeof lat1 === "number" && typeof lon1 === "number") {
      return { lat: lat1, lon: lon1 };
    }
    return {};
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "We need photo library permission to pick an image.");
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      // Resize the image to a reasonable size
      const manipResult = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      setImageUri(manipResult.uri);
    }
  };

  const onSubmit = async () => {
    if (!title || !price || !imageUri) {
      Alert.alert("Incomplete", "Please fill in all required fields and add a photo.");
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await createPost({
        title,
        description: description || undefined,
        price: parseFloat(price),
        condition,
        category,
        imageUri,
      });
      
      if (res.ok) {
        router.push(`/post/${res.id}` as any);
      } else {
        Alert.alert("Error", res.reason || "Failed to create listing. Please try again.");
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#0a0a0a' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Sell an Item</Text>
        
        {/* Image Upload */}
        <View style={styles.imageUploadContainer}>
          {imageUri ? (
            <TouchableOpacity onPress={pickImage} style={styles.imagePreview}>
              <Image 
                source={{ uri: imageUri }} 
                style={styles.previewImage} 
                resizeMode="cover"
              />
              <View style={styles.changePhotoButton}>
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
              <Ionicons name="camera" size={32} color="#666" />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Form Fields */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Item Name*</Text>
          <TextInput 
            placeholder="What are you selling?" 
            placeholderTextColor="#888" 
            style={styles.input} 
            value={title} 
            onChangeText={setTitle} 
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Price*</Text>
          <View style={styles.priceInputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              placeholder="0.00"
              placeholderTextColor="#888"
              style={[styles.input, styles.priceInput]}
              keyboardType="decimal-pad"
              value={price}
              onChangeText={setPrice}
            />
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Condition*</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={condition}
              onValueChange={(itemValue) => setCondition(itemValue as Condition)}
              style={styles.picker}
              dropdownIconColor="#666"
            >
              {CONDITIONS.map((cond) => (
                <Picker.Item key={cond} label={cond} value={cond} />
              ))}
            </Picker>
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Category*</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={category}
              onValueChange={(itemValue) => setCategory(itemValue)}
              style={styles.picker}
              dropdownIconColor="#666"
            >
              {CATEGORIES.map((cat) => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            placeholder="Include details like size, brand, color, etc."
            placeholderTextColor="#888"
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </View>
        
        <TouchableOpacity 
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]} 
          onPress={onSubmit}
          disabled={isLoading}
        >
          <Text style={styles.submitButtonText}>{isLoading ? 'Posting…' : 'Post Item'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 24, color: '#fff' },
  imageUploadContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  addPhotoButton: {
    width: '100%',
    height: 180,
    borderWidth: 1,
    borderColor: '#222',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  addPhotoText: {
    marginTop: 8,
    color: '#aaa',
    fontSize: 16,
  },
  imagePreview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  changePhotoText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#ddd',
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#fff',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    overflow: 'hidden',
  },
  currencySymbol: {
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#aaa',
    backgroundColor: '#161616',
    height: '100%',
    textAlignVertical: 'center',
  },
  priceInput: {
    flex: 1,
    borderWidth: 0,
    borderLeftWidth: 1,
    borderColor: '#222',
    borderRadius: 0,
    marginBottom: 0,
    paddingLeft: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  picker: {
    height: 50,
    color: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#4da3ff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#2b5e91',
  },
  submitButtonText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '700',
  },
  row: { 
    flexDirection: 'row' 
  },
  half: { 
    flex: 1 
  },
})
;

