import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useStore } from "@/store";

export default function SettingsScreen() {
  const [signingOut, setSigningOut] = React.useState(false);
  const { resolvedThemeMode } = useStore();

  const theme = React.useMemo(() => {
    if (resolvedThemeMode === 'light') {
      return {
        bg: '#FFF5F8',
        text: '#1a1a1a',
        card: '#ffffff',
        border: '#f0cfd8',
      } as const;
    }
    return {
      bg: '#0a0a0a',
      text: '#fff',
      card: '#111',
      border: '#222',
    } as const;
  }, [resolvedThemeMode]);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.replace("/auth/sign-in" as any);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to sign out");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        <TouchableOpacity style={[styles.item, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => Alert.alert('Account', 'Account settings placeholder') }>
          <Text style={[styles.itemText, { color: theme.text }]}>Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.item, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => Alert.alert('Notifications', 'Notifications settings placeholder') }>
          <Text style={[styles.itemText, { color: theme.text }]}>Notifications</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.item, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => Alert.alert('Privacy', 'Privacy settings placeholder') }>
          <Text style={[styles.itemText, { color: theme.text }]}>Privacy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.item, { marginTop: 20, backgroundColor: theme.card, borderColor: theme.border }]} onPress={onSignOut} disabled={signingOut}>
          <Text style={[styles.itemText, { color: theme.text }]}>{signingOut ? "Signing out…" : "Sign out"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  body: { flex: 1, padding: 16 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 12 },
  item: { backgroundColor: "#111", borderWidth: 1, borderColor: "#222", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 12, marginBottom: 12 },
  itemText: { color: "#fff", fontWeight: "700" },
});
