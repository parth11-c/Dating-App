import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, Linking } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from 'expo-web-browser';

export default function UserProfileViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userPosts } = useStore();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = React.useState<{ name?: string; avatar_url?: string; phone?: string } | null>(null);

  const formatPhone = (raw?: string) => {
    if (!raw) return '';
    const m = raw.match(/^(\+\d{1,2})(\d{3,11})$/);
    if (!m) return raw;
    const cc = m[1];
    const digits = m[2];
    if (cc === '+91' && digits.length === 10) {
      return `${cc} ${digits.slice(0,5)} ${digits.slice(5)}`;
    }
    if (cc === '+1' && digits.length === 10) {
      return `${cc} ${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`;
    }
    const parts: string[] = [];
    let rest = digits;
    while (rest.length > 4) {
      parts.push(rest.slice(0,3));
      rest = rest.slice(3);
    }
    parts.push(rest);
    return `${cc} ${parts.join(' ')}`.trim();
  };

  if (!id) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No user specified.</Text>
      </View>
    );
  }

  const posts = userPosts(id);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) return;
      const { data } = await supabase.from('profiles').select('name, avatar_url, phone').eq('id', id).single();
      if (mounted) setProfile(data as any);
    })();
    return () => { mounted = false; };
  }, [id]);

  const handleCall = () => {
    const phoneNumber = profile?.phone?.replace(/\s+/g, '');
    if (!phoneNumber) {
      Alert.alert('No phone number', 'This user has not added a phone number yet.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleWhatsApp = () => {
    const message = `Hi, I found your profile on ClgMart.`;
    const raw = profile?.phone?.trim();
    if (!raw) {
      Alert.alert('WhatsApp unavailable', 'This user has not added a WhatsApp number yet.');
      return;
    }
    const digits = raw.replace(/\D+/g, '');
    if (!digits) {
      Alert.alert('Invalid number', 'The user phone number appears invalid.');
      return;
    }
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    WebBrowser.openBrowserAsync(url);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.header}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{profile?.name || 'User'}</Text>
            <Text style={styles.sub}>{formatPhone(profile?.phone) || 'WhatsApp not added'}</Text>
          </View>
        </View>
        {/* Actions (match profile page but Edit -> Message) */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => router.push(`/message/${id}` as any)}>
            <Ionicons name="chatbubble-ellipses" size={16} color="#4da3ff" />
            <Text style={styles.editBtnText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.wpBtn} onPress={handleWhatsApp}>
            <Ionicons name="logo-whatsapp" size={16} color="#1f3124" />
            <Text style={styles.wpBtnText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.divider} />

      <View style={styles.sectionRow}>
        <Text style={styles.section}>Products</Text>
        <View style={styles.countBadge}><Text style={styles.countBadgeText}>{posts.length}</Text></View>
      </View>
      {posts.length === 0 ? (
        <Text style={styles.muted}>No posts yet.</Text>
      ) : (
        <FlatList
          key={'grid-2'}
          data={posts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.gridItem} onPress={() => router.push(`/post/${item.id}` as any)}>
              <Image source={{ uri: item.imageUri }} style={styles.gridImage} resizeMode="cover" />
              <View style={styles.gridFooter}>
                <Text style={styles.gridTitle} numberOfLines={1}>{(item as any).title || 'Product'}</Text>
                {!!(item as any).price && (
                  <Text style={styles.gridPrice}>₹{Number((item as any).price).toFixed(0)}</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0a0a0a" },
  headerCard: { 
    backgroundColor: '#0f0f0f', 
    borderColor: '#1e1e1e', 
    borderWidth: 1, 
    borderRadius: 14, 
    padding: 12, 
    marginBottom: 12,
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#444", marginRight: 12 },
  avatarImage: { width: 64, height: 64, borderRadius: 32, marginRight: 12 },
  name: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 2 },
  sub: { color: "#aaa" },
  section: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 8, marginBottom: 6 },
  muted: { color: "#9aa0a6" },
  card: { backgroundColor: "#111", borderColor: "#222", borderWidth: 1, borderRadius: 10, padding: 16, marginBottom: 8 },
  cardTitle: { color: "#fff", fontWeight: "600", marginBottom: 4 },
  mutedSmall: { color: "#888", fontSize: 12 },
  actions: { gap: 10 },
  divider: { height: 1, backgroundColor: '#141414', borderBottomColor: '#1f1f1f', borderBottomWidth: 1, marginVertical: 8 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 6 },
  countBadge: { backgroundColor: '#121417', borderColor: '#1f2329', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  countBadgeText: { color: '#a6b1b8', fontSize: 12, fontWeight: '700' },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', backgroundColor: '#0f1b28', borderWidth: 1, borderColor: '#2a5b86', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  editBtnText: { color: '#4da3ff', fontWeight: '700' },
  gridContent: { paddingTop: 8 },
  gridRow: { justifyContent: 'space-between', marginBottom: 8 },
  gridItem: {
    backgroundColor: '#111',
    borderColor: '#222',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    width: '49%',
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  gridImage: { width: '100%', aspectRatio: 1 },
  gridFooter: { paddingHorizontal: 8, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gridTitle: { color: '#eee', fontSize: 12, flex: 1, marginRight: 6, fontWeight: '600' },
  gridPrice: { color: '#7ddc7a', fontSize: 12, fontWeight: '800' },
  wpBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', backgroundColor: '#25D366', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#199e4d' },
  wpBtnText: { color: '#1f3124', fontWeight: '800' },
});
