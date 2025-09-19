import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { router } from "expo-router";

export default function ProfileScreen() {
  const { currentUser, userPosts, deletePost } = useStore();
  const posts = userPosts(currentUser.id);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // container horizontal padding = 12 on both sides; column gap = 8
  const CELL_GAP = 8;
  const H_PADDING = 12;
  const cellWidth = Math.floor((width - H_PADDING * 2 - CELL_GAP) / 2);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{currentUser.name}</Text>
          <Text style={styles.sub}>@{currentUser.id}</Text>
        </View>
      </View>

      <Text style={styles.section}>Your posts</Text>
      {posts.length === 0 ? (
        <Text style={styles.muted}>No posts yet.</Text>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: CELL_GAP }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
              <TouchableOpacity style={[styles.gridItem, { width: cellWidth }]} onPress={() => router.push(`/post/${item.id}` as any)} activeOpacity={0.8}>
                <Image source={{ uri: item.imageUri }} style={styles.gridImage} />
                {currentUser.id === item.userId ? (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => {
                      Alert.alert('Delete post', 'Are you sure you want to delete this post?', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            const res = await deletePost(item.id);
                            if (!res.ok) Alert.alert('Delete failed', res.reason);
                          },
                        },
                      ]);
                    }}
                  >
                    <Text style={styles.deleteIcon}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 12 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#444", marginRight: 12 },
  name: { color: "#fff", fontSize: 18, fontWeight: "700" },
  sub: { color: "#aaa" },
  section: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 8, marginBottom: 6 },
  muted: { color: "#9aa0a6" },
  gridItem: { position: 'relative', backgroundColor: '#111', borderColor: '#222', borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  gridImage: { width: '100%', aspectRatio: 1 },
  deleteBtn: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  deleteIcon: { color: '#fff', fontWeight: '700' },
});
