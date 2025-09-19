import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useStore } from "@/store";

export default function UserProfileViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userPosts } = useStore();

  if (!id) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No user specified.</Text>
      </View>
    );
  }

  const posts = userPosts(id);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>User {id}</Text>
          <Text style={styles.sub}>Public profile</Text>
        </View>
      </View>

      <Text style={styles.section}>Posts</Text>
      {posts.length === 0 ? (
        <Text style={styles.muted}>No posts yet.</Text>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.muted}>{new Date(item.createdAt).toLocaleString()} • Visitors {item.visitors.length}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0a0a0a" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#444", marginRight: 12 },
  name: { color: "#fff", fontSize: 18, fontWeight: "700" },
  sub: { color: "#aaa" },
  section: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 8, marginBottom: 6 },
  muted: { color: "#9aa0a6" },
  card: { backgroundColor: "#111", borderColor: "#222", borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  cardTitle: { color: "#fff", fontWeight: "600", marginBottom: 4 },
});
