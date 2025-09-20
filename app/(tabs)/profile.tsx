import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, Linking } from "react-native";
import { Ionicons } from '@expo/vector-icons';
// Removed SafeAreaView and insets
import { useStore } from "@/store";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function ProfileScreen() {
  const { currentUser, userPosts, deletePost } = useStore();
  const posts = userPosts(currentUser.id);

  const formatPhone = (raw?: string) => {
    if (!raw) return '';
    const m = raw.match(/^(\+\d{1,3})(\d{5,14})$/);
    if (!m) return raw; // fallback to raw if it doesn't match our simple pattern
    const cc = m[1];
    const digits = m[2];
    // India: +91 XXXXX XXXXX (10 national digits: 5-5)
    if (cc === '+91' && digits.length === 10) {
      return `${cc} ${digits.slice(0,5)} ${digits.slice(5)}`;
    }
    // US/Canada: +1 555 123 4567 (10 national digits: 3-3-4)
    if (cc === '+1' && digits.length === 10) {
      return `${cc} ${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`;
    }
    // Default: group from the end in 3-3-4-ish chunks for readability
    const parts: string[] = [];
    let rest = digits;
    while (rest.length > 4) {
      parts.push(rest.slice(0,3));
      rest = rest.slice(3);
    }
    parts.push(rest);
    return `${cc} ${parts.join(' ')}`.trim();
  };

  const onLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    } finally {
      router.replace('/auth/sign-in' as any);
    }
  };

  const confirmDelete = (postId: string) => {
    Alert.alert(
      'Delete post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          const res = await deletePost(postId);
          if (!res.ok) {
            Alert.alert('Error', res.reason || 'Failed to delete post.');
          }
        }},
      ]
    );
  };

  const openWhatsApp = async () => {
    const raw = currentUser?.phone || '';
    const digits = raw.replace(/\D+/g, '');
    if (!digits) {
      Alert.alert('Phone required', 'Add your WhatsApp number in profile to chat.');
      return;
    }
    const url = `https://wa.me/${digits}`; // WhatsApp expects digits only, no +
    try {
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert('Cannot open WhatsApp', e.message || 'Please ensure WhatsApp is installed or try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {currentUser?.avatar ? (
          <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{currentUser.name}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/profile/edit' as any)}>
          <Ionicons name="create-outline" size={16} color="#4da3ff" />
          <Text style={styles.editBtnText}>Edit profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.wpBtn} onPress={openWhatsApp}>
          <Ionicons name="logo-whatsapp" size={16} color="#1f3124" />
          <Text style={styles.wpBtnText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={16} color="#fff" />
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {(!currentUser?.avatar || !currentUser?.name || currentUser?.name === 'User' || !currentUser?.phone) && (
        <TouchableOpacity style={styles.prompt} onPress={() => router.push('/profile/edit' as any)}>
          <Ionicons name="information-circle-outline" size={16} color="#ffd166" />
          <Text style={styles.promptText}>Complete your profile to build trust. Add your name, profile photo, and WhatsApp number.</Text>
        </TouchableOpacity>
      )}

      {/* Contact number hidden as requested */}

      <Text style={styles.section}>Your products</Text>
      {posts.length === 0 ? (
        <Text style={styles.muted}>No posts yet.</Text>
      ) : (
        <FlatList
          key={'grid-2'}
          data={posts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.gridContent, { paddingBottom: 80 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.gridItem} 
              onPress={() => router.push(`/post/${item.id}` as any)}
              onLongPress={() => confirmDelete(item.id)}
            >
              <Image source={{ uri: item.imageUri }} style={styles.gridImage} resizeMode="cover" />
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => confirmDelete(item.id)}
                hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
              >
                <View style={styles.deleteBtnBg}>
                  <Ionicons name="close" size={14} color="#fff" />
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", paddingHorizontal: 12, paddingTop: 1 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 6 ,marginTop: 16},
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#444", marginRight: 12 },
  name: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 2 },
  sub: { color: "#aaa" },
  section: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 8, marginBottom: 6 },
  muted: { color: "#9aa0a6" },
  card: { backgroundColor: "#111", borderColor: "#222", borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  cardTitle: { color: "#fff", fontWeight: "600", marginBottom: 4 },
  mutedSmall: { color: "#888", fontSize: 12 },
  actions: { marginBottom: 16, gap: 10 },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', backgroundColor: '#0f1b28', borderWidth: 1, borderColor: '#2a5b86', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  editBtnText: { color: '#4da3ff', fontWeight: '700' },
  phoneRow: { marginBottom: 14 },
  contactCard: { backgroundColor: '#111', borderColor: '#222', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  phonePill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#121417', borderWidth: 1, borderColor: '#1f2329', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, marginTop: 6 },
  phoneText: { color: '#a6b1b8', fontSize: 13, fontWeight: '600' },
  wpBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', backgroundColor: '#25D366', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#199e4d' },
  wpBtnText: { color: '#1f3124', fontWeight: '800' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', backgroundColor: '#c0392b', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#9e2f23' },
  logoutBtnText: { color: '#fff', fontWeight: '800' },
  prompt: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#161616', borderWidth: 1, borderColor: '#222', padding: 10, borderRadius: 10, marginBottom: 8 },
  promptText: { color: '#ddd', flex: 1, fontSize: 13 },
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
});
