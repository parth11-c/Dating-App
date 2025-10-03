import React, { useMemo } from "react";
import { View, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store";
import ProfileView from "../(tabs)/profile-view";

export default function UserProfileViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser, resolvedThemeMode } = useStore();
  const [liking, setLiking] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  const theme = useMemo(() => {
    if (resolvedThemeMode === 'light') {
      return {
        bg: '#FFF5F8',
        text: '#1a1a1a',
        border: '#f0cfd8',
        accent: '#ff5b80',
      } as const;
    }
    return {
      bg: '#0a0a0a',
      text: '#fff',
      border: '#191919',
      accent: '#ff5b80',
    } as const;
  }, [resolvedThemeMode]);

  const onLike = async () => {
    try {
      if (!id || !currentUser?.id) return;
      setLiking(true);
      // If already matched, don't send a request again; show subtle notice and go to Matches
      const a = currentUser.id < id ? currentUser.id : id;
      const b = currentUser.id < id ? id : currentUser.id;
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${a},user2_id.eq.${b}),and(user1_id.eq.${b},user2_id.eq.${a})`)
        .maybeSingle();
      if (existingMatch) {
        setToast('Already a match');
        setTimeout(() => setToast(null), 1500);
        setLiking(false);
        router.push('/(tabs)/matches' as any);
        return;
      }
      // Create like request only; match is created when the other accepts
      const { data: existing } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', currentUser.id)
        .eq('liked_id', id)
        .maybeSingle();
      if (!existing) {
        await supabase.from('likes').insert({ liker_id: currentUser.id, liked_id: id });
      }
      setToast('Request sent');
      setTimeout(() => setToast(null), 2000);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    } finally {
      setLiking(false);
    }
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header to match tabs style */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={18} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>
      {/* Reuse the unified ProfileView UI and always show Like action */}
      <ProfileView
        userId={id}
        onLike={onLike}
        liking={liking}
        actions={(
          <View style={styles.actionsRow} pointerEvents="box-none">
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={onLike}
              disabled={liking}
              style={styles.likeFab}
              accessibilityLabel="Like"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {liking ? (
                <ActivityIndicator color="#ff5b80" />
              ) : (
                <Ionicons name="heart" size={22} color="#ff5b80" />
              )}
            </TouchableOpacity>
          </View>
        )}
      />
      {/* In-app toast */}
      {toast && (
        <View pointerEvents="none" style={styles.toastWrap}>
          <View style={[styles.toast, { backgroundColor: resolvedThemeMode === 'light' ? '#1a1a1a' : '#222', borderColor: resolvedThemeMode === 'light' ? '#333' : '#444' }]}>
            <Text style={[styles.toastText, { color: '#fff' }]}>{toast}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  headerBtn: { width: 40, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontWeight: '800', fontSize: 18 },
  actionsRow: { flexDirection: 'row', alignItems: 'center' },
  likeFab: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a0f14', borderWidth: 1, borderColor: '#2a1a22' },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center', justifyContent: 'center' },
  toast: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, maxWidth: '80%' },
  toastText: { fontWeight: '700' },
});
