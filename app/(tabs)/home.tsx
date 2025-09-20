import React from "react";
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, Linking } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from '@expo/vector-icons';

type Post = ReturnType<typeof useStore>["posts"][number];

function PostCard({ item }: { item: Post }) {
  const [seller, setSeller] = React.useState<{ name?: string; avatar_url?: string; phone?: string } | null>(null);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('name, avatar_url, phone')
        .eq('id', item.userId)
        .single();
      if (mounted) setSeller(data as any);
    })();
    return () => { mounted = false; };
  }, [item.userId]);

  const handleWhatsApp = () => {
    const message = `Hi, I'm interested in your product: ${item.title}`;
    const raw = seller?.phone?.trim();
    if (!raw) {
      Alert.alert('WhatsApp unavailable', 'The seller has not added a WhatsApp number yet.');
      return;
    }
    const digits = raw.replace(/\D+/g, '');
    if (!digits) {
      Alert.alert('Invalid number', 'The seller phone number appears invalid.');
      return;
    }
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch((e) => Alert.alert('Cannot open WhatsApp', e?.message || 'Please try again.'));
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/post/${item.id}` as any)}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: item.imageUri }} style={styles.image} />
        <View style={styles.imageOverlay} />
        <View style={styles.priceBadge}><Text style={styles.priceBadgeText}>₹{item.price?.toFixed?.(0) ?? item.price}</Text></View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>{item.category} • {String(item.condition).toLowerCase()} condition</Text>
        <View style={styles.sellerRow}>
          {seller?.avatar_url ? (
            <Image source={{ uri: seller.avatar_url }} style={styles.sellerAvatar} />
          ) : (
            <View style={styles.sellerAvatarPlaceholder} />
          )}
          <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push(`/profile/${item.userId}` as any)}>
            <Text style={styles.sellerName} numberOfLines={1}>{seller?.name || 'Seller'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.wpIconBtn} onPress={handleWhatsApp} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="logo-whatsapp" size={14} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { posts } = useStore();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      {posts.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.text}>No products yet. Be the first to list an item!</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          renderItem={({ item }) => (<PostCard item={item as any} />)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  text: { color: "#fff", textAlign: "center" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  list: { padding: 12 },
  card: { 
    backgroundColor: "#111", 
    borderRadius: 12, 
    overflow: "hidden", 
    marginBottom: 12, 
    borderColor: "#222", 
    borderWidth: 1,
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  imageWrap: { position: 'relative' },
  image: { width: "100%", height: 180, backgroundColor: "#222" },
  imageOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, backgroundColor: 'rgba(0,0,0,0.08)' },
  priceBadge: { position: 'absolute', left: 8, bottom: 8, backgroundColor: 'rgba(10,10,10,0.85)', borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  priceBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  cardBody: { padding: 12 },
  title: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 2 },
  meta: { color: "#aaa", fontSize: 12, marginBottom: 10 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sellerAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
  sellerAvatarPlaceholder: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
  sellerName: { color: '#ddd', fontSize: 12, fontWeight: '600' },
  wpIconBtn: { backgroundColor: '#111', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderColor: '#222' },
});
