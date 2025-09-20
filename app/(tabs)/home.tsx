import React from "react";
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { router } from "expo-router";

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
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/post/${item.id}` as any)}>
              <Image source={{ uri: item.imageUri }} style={styles.image} />
              <View style={styles.cardBody}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>₹{item.price?.toFixed?.(2) ?? item.price} • {item.condition} • {item.category}</Text>
                <Text style={styles.metaSmall}>{new Date(item.createdAt).toLocaleDateString()} • {item.status?.toUpperCase?.() || 'ACTIVE'}</Text>
                <TouchableOpacity onPress={() => router.push(`/profile/${item.userId}` as any)}>
                  <Text style={styles.link}>View author</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
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
  card: { backgroundColor: "#111", borderRadius: 12, overflow: "hidden", marginBottom: 12, borderColor: "#222", borderWidth: 1 },
  image: { width: "100%", height: 180, backgroundColor: "#222" },
  cardBody: { padding: 12 },
  title: { color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 6 },
  meta: { color: "#aaa", fontSize: 12 },
  metaSmall: { color: "#888", fontSize: 11, marginBottom: 8, marginTop: 2 },
  link: { color: "#4da3ff" },
});
