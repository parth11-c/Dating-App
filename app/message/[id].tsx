import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useStore } from '@/store';
import { supabase } from '@/lib/supabase';

export default function MessageScreen() {
  const { id: otherId } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useStore();
  const myId = currentUser.id;
  const peerId = otherId || '';

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!myId || !peerId) return;
      // Find existing match between the two users (order invariant)
      const a = myId < peerId ? myId : peerId;
      const b = myId < peerId ? peerId : myId;
      const { data: existing } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id')
        .or(`and(user1_id.eq.${a},user2_id.eq.${b}),and(user1_id.eq.${b},user2_id.eq.${a})`)
        .maybeSingle();
      let matchId = existing?.id as number | undefined;
      if (!matchId) {
        const { data: created, error } = await supabase
          .from('matches')
          .insert({ user1_id: a, user2_id: b })
          .select('id')
          .single();
        if (!error) matchId = (created as any)?.id as number;
      }
      if (mounted && matchId) {
        router.replace(`/chat/${matchId}` as any);
      }
    })();
    return () => { mounted = false; };
  }, [myId, peerId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}> 
        <ActivityIndicator color="#fff" />
        <Text style={{ color: '#9aa0a6', marginTop: 8 }}>Opening chat…</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
