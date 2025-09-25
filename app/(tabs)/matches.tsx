import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store';
import { router } from 'expo-router';

interface MatchRow {
  id: number;
  user1_id: string;
  user2_id: string;
  created_at: string;
  other?: { id: string; name?: string; avatar_url?: string | null };
}

export default function MatchesScreen() {
  const { currentUser } = useStore();
  const [loading, setLoading] = React.useState(true);
  const [matches, setMatches] = React.useState<MatchRow[]>([]);
  const [incoming, setIncoming] = React.useState<{ id: number; liker_id: string; profile?: { id: string; name?: string; avatar_url?: string | null } }[]>([]);
  const [unlocked, setUnlocked] = React.useState(false); // simple demo paywall state

  const load = React.useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id, created_at')
        .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });
      if (!error && data) {
        // load other users' profiles
        const others = Array.from(new Set(data.map(m => (m.user1_id === currentUser.id ? m.user2_id : m.user1_id))));
        let profiles: Record<string, { id: string; name?: string; avatar_url?: string | null }> = {};
        if (others.length) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .in('id', others);
          for (const p of profs || []) profiles[p.id] = p as any;
        }
        const enriched = (data as any[]).map(m => ({
          ...m,
          other: profiles[m.user1_id === currentUser.id ? m.user2_id : m.user1_id]
        })) as MatchRow[];
        setMatches(enriched);
      }

      // Load incoming likes (who liked me that I haven't liked back yet and not matched)
      const { data: incomingLikes } = await supabase
        .from('likes')
        .select('id, liker_id, liked_id')
        .eq('liked_id', currentUser.id);
      const myLikes = new Set<string>();
      {
        const { data: mine } = await supabase
          .from('likes')
          .select('liked_id')
          .eq('liker_id', currentUser.id);
        for (const r of mine || []) myLikes.add((r as any).liked_id);
      }
      const matchedPairs = new Set<string>(data?.map(m => {
        const a = m.user1_id < m.user2_id ? `${m.user1_id}-${m.user2_id}` : `${m.user2_id}-${m.user1_id}`;
        return a;
      }) || []);
      const inc = [] as { id: number; liker_id: string; profile?: { id: string; name?: string; avatar_url?: string | null } }[];
      const neededIds: string[] = [];
      for (const r of incomingLikes || []) {
        const liker = (r as any).liker_id as string;
        if (myLikes.has(liker)) continue; // I already liked back
        const pairKey = liker < currentUser.id ? `${liker}-${currentUser.id}` : `${currentUser.id}-${liker}`;
        if (matchedPairs.has(pairKey)) continue; // already matched
        inc.push({ id: (r as any).id, liker_id: liker });
        neededIds.push(liker);
      }
      if (neededIds.length) {
        const { data: profs } = await supabase.from('profiles').select('id, name, avatar_url').in('id', neededIds);
        const map: Record<string, any> = {};
        for (const p of profs || []) map[(p as any).id] = p;
        setIncoming(inc.map(i => ({ ...i, profile: map[i.liker_id] })));
      } else {
        setIncoming([]);
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  React.useEffect(() => { load(); }, [load]);

  const likeBack = async (otherId: string) => {
    try {
      const { error } = await supabase.from('likes').insert({ liker_id: currentUser.id, liked_id: otherId });
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      await load();
      Alert.alert('Liked back', 'If they liked you, it’s a match!');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to like back');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#fff" />
        <Text style={{ color: '#9aa0a6', marginTop: 8 }}>Loading matches…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Incoming likes preview */}
      <Text style={styles.section}>Who liked you</Text>
      {incoming.length === 0 ? (
        <Text style={[styles.muted, { paddingHorizontal: 12, marginBottom: 8 }]}>No incoming likes yet.</Text>
      ) : (
        <View>
          {!unlocked && (
            <View style={{ paddingHorizontal: 12, marginBottom: 12 }}>
              <View style={{ position: 'absolute', left: 12, right: 12, top: 0, bottom: 0, zIndex: 2, alignItems: 'center', justifyContent: 'center' }}>
                {/* Blur overlay */}
                <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
                  {/* @ts-ignore: BlurView available after expo-blur installed */}
                  <BlurView intensity={60} tint="dark" style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
                    <View style={{ flex: 1 }} />
                  </BlurView>
                </View>
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Unlock to see who liked you</Text>
                  <TouchableOpacity style={styles.unlockBtn} onPress={() => setUnlocked(true)}>
                    <Text style={styles.unlockBtnText}>Unlock</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          <FlatList
            data={incoming}
            keyExtractor={(m) => String(m.id)}
            horizontal
            style={{ paddingHorizontal: 12, marginBottom: 12 }}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => (
              <View style={styles.likeCard}>
                {item.profile?.avatar_url ? (
                  <Image source={{ uri: item.profile.avatar_url }} style={styles.likeAvatar} />
                ) : (
                  <View style={styles.likeAvatar} />
                )}
                <Text style={styles.likeName} numberOfLines={1}>{item.profile?.name || 'Someone'}</Text>
                <TouchableOpacity style={styles.likeBtn} onPress={() => likeBack(item.liker_id)}>
                  <Text style={styles.likeBtnText}>Like back</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}

      {matches.length === 0 ? (
        <View style={styles.center}> 
          <Text style={styles.muted}>No matches yet. Keep exploring!</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => router.push(`/chat/${item.id}` as any)}>
              {item.other?.avatar_url ? (
                <Image source={{ uri: item.other.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatar} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{item.other?.name || 'Match'}</Text>
                <Text style={styles.sub} numberOfLines={1}>Matched on {new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#9aa0a6' },
  section: { color: '#fff', fontWeight: '700', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 12, marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
  title: { color: '#fff', fontWeight: '700' },
  sub: { color: '#888', fontSize: 12 },
  likeCard: { width: 120, backgroundColor: '#111', borderColor: '#222', borderWidth: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
  likeAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#222', borderWidth: 1, borderColor: '#333', marginBottom: 8 },
  likeName: { color: '#fff', fontWeight: '700', marginBottom: 6 },
  likeBtn: { backgroundColor: '#1a0f14', borderWidth: 1, borderColor: '#2a1a22', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  likeBtnText: { color: '#ff5b80', fontWeight: '800' },
  unlockBtn: { backgroundColor: '#cce6ff', borderWidth: 1, borderColor: '#7cc5e6', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  unlockBtnText: { color: '#0a0a0a', fontWeight: '800' },
});
