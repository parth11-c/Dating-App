import React from "react";
import { View, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store";
import ProfileView from "../(tabs)/profile-view";

export default function UserProfileViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useStore();
  const [liking, setLiking] = React.useState(false);

  const onLike = async () => {
    try {
      if (!id || !currentUser?.id) return;
      setLiking(true);
      // If already liked, go to matches
      const { data: existing } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', currentUser.id)
        .eq('liked_id', id)
        .maybeSingle();
      if (existing) {
        router.push('/(tabs)/matches' as any);
        return;
      }
      const { error } = await supabase.from('likes').insert({ liker_id: currentUser.id, liked_id: id });
      if (error) {
        Alert.alert('Could not like', error.message);
        return;
      }
      // Check mutual
      const { data: mutual } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', id)
        .eq('liked_id', currentUser.id)
        .maybeSingle();
      if (mutual) {
        // Ensure a match row exists (order-invariant pair)
        try {
          const a = currentUser.id < id ? currentUser.id : id;
          const b = currentUser.id < id ? id : currentUser.id;
          const { data: existingMatch } = await supabase
            .from('matches')
            .select('id')
            .or(`and(user1_id.eq.${a},user2_id.eq.${b}),and(user1_id.eq.${b},user2_id.eq.${a})`)
            .maybeSingle();
          if (!existingMatch) {
            await supabase.from('matches').insert({ user1_id: a, user2_id: b });
          }
        } catch {}
        router.push('/(tabs)/matches' as any);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    } finally {
      setLiking(false);
    }
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionsRow: { flexDirection: 'row', alignItems: 'center' },
  likeFab: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a0f14', borderWidth: 1, borderColor: '#2a1a22' },
});
