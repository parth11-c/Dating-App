import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";

export default function SettingsScreen() {
  const [signingOut, setSigningOut] = React.useState(false);

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
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity style={styles.item} onPress={() => Alert.alert('Account', 'Account settings placeholder') }>
          <Text style={styles.itemText}>Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => Alert.alert('Notifications', 'Notifications settings placeholder') }>
          <Text style={styles.itemText}>Notifications</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={() => Alert.alert('Privacy', 'Privacy settings placeholder') }>
          <Text style={styles.itemText}>Privacy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.item, { borderColor: '#7a1f1f' }]} onPress={() => Alert.alert('Delete account', 'This will permanently delete your account. Continue?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Requested', 'We will implement delete flow here.') },
        ])}>
          <Text style={[styles.itemText, { color: '#ff6b6b' }]}>Delete account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.item, { marginTop: 20 }]} onPress={onSignOut} disabled={signingOut}>
          <Text style={styles.itemText}>{signingOut ? "Signing out…" : "Sign out"}</Text>
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
