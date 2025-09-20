import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function UserProfileViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userPosts } = useStore();
  const [profile, setProfile] = React.useState<{ name?: string; avatar_url?: string } | null>(null);

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
      const { data } = await supabase.from('profiles').select('name, avatar_url').eq('id', id).single();
      if (mounted) setProfile(data as any);
    })();
    return () => { mounted = false; };
  }, [id]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{profile?.name || 'User'}</Text>
          <Text style={styles.sub}>@{id}</Text>
        </View>
      </View>

      <Text style={styles.section}>Products</Text>
      {posts.length === 0 ? (
        <Text style={styles.muted}>No posts yet.</Text>
      ) : (
        <FlatList
          key={'grid-2'}
          data={posts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.gridContent, { paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.gridItem} onPress={() => router.push(`/post/${item.id}` as any)}>
              <Image source={{ uri: item.imageUri }} style={styles.gridImage} resizeMode="cover" />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0a0a0a" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#444", marginRight: 12 },
  avatarImage: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  name: { color: "#fff", fontSize: 18, fontWeight: "700" },
  sub: { color: "#aaa" },
  section: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 8, marginBottom: 6 },
  muted: { color: "#9aa0a6" },
  card: { backgroundColor: "#111", borderColor: "#222", borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  cardTitle: { color: "#fff", fontWeight: "600", marginBottom: 4 },
  mutedSmall: { color: "#888", fontSize: 12 },
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
});
