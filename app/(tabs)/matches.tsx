import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
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
  const { currentUser, themeMode } = useStore();
  const [loading, setLoading] = React.useState(true);
  const [matches, setMatches] = React.useState<MatchRow[]>([]);
  const [incoming, setIncoming] = React.useState<{ id: number; liker_id: string; profile?: { id: string; name?: string; avatar_url?: string | null } }[]>([]);

  const theme = useMemo(() => {
    if (themeMode === 'light') {
      return {
        bg: '#FFF5F8',
        card: '#ffffff',
        border: '#f0cfd8',
        text: '#1a1a1a',
        muted: '#7d6a72',
        sub: '#6b5b61',
        avatarBg: '#f3dbe3',
        accent: '#ff5b80',
        accentSubtle: '#ffe9f0',
      } as const;
    }
    return {
      bg: '#0a0a0a',
      card: '#111',
      border: '#222',
      text: '#fff',
      muted: '#9aa0a6',
      sub: '#888',
      avatarBg: '#222',
      accent: '#ff5b80',
      accentSubtle: '#1a0f14',
    } as const;
  }, [themeMode]);

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
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }]} edges={['left','right','bottom']}> 
        <ActivityIndicator color={themeMode === 'light' ? theme.accent : '#fff'} />
        <Text style={{ color: theme.muted, marginTop: 8 }}>Loading matches…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['left','right','bottom']}>
      {/* Incoming likes preview */}
      <Text style={[styles.section, { color: theme.text }]}>Who liked you</Text>
      {incoming.length === 0 ? (
        <Text style={[styles.muted, { color: theme.muted, paddingHorizontal: 12, marginBottom: 8 }]}>No incoming likes yet.</Text>
      ) : (
        <View>
          <FlatList
            data={incoming}
            keyExtractor={(m) => String(m.id)}
            horizontal
            style={{ paddingHorizontal: 12, marginBottom: 12 }}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => (
              <View style={[styles.likeCard, { backgroundColor: theme.card, borderColor: theme.border }] }>
                {item.profile?.avatar_url ? (
                  <Image source={{ uri: item.profile.avatar_url }} style={styles.likeAvatar} />
                ) : (
                  <View style={[styles.likeAvatar, { backgroundColor: theme.avatarBg, borderColor: theme.border }]} />
                )}
                <Text style={[styles.likeName, { color: theme.text }]} numberOfLines={1}>{item.profile?.name || 'Someone'}</Text>
                <TouchableOpacity style={[styles.likeBtn, { backgroundColor: theme.accentSubtle, borderColor: themeMode === 'light' ? theme.border : '#2a1a22' }]} onPress={() => likeBack(item.liker_id)}>
                  <Text style={[styles.likeBtnText, { color: theme.accent }]}>Like back</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}

      {matches.length === 0 ? (
        <View style={styles.center}> 
          <Text style={[styles.muted, { color: theme.muted }]}>No matches yet. Keep exploring!</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {item.other?.avatar_url ? (
                <Image source={{ uri: item.other.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.avatarBg, borderColor: theme.border }]} />
              )}
              <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push(`/profile/${item.other?.id}` as any)}>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{item.other?.name || 'Match'}</Text>
                <Text style={[styles.sub, { color: theme.sub }]} numberOfLines={1}>Matched on {new Date(item.created_at).toLocaleDateString()}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#9aa0a6' },
  section: { fontWeight: '800', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1 },
  title: { fontWeight: '700' },
  sub: { fontSize: 12 },
  likeCard: { width: 120, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  likeAvatar: { width: 68, height: 68, borderRadius: 34, borderWidth: 1, marginBottom: 8 },
  likeName: { fontWeight: '700', marginBottom: 6 },
  likeBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
  likeBtnText: { fontWeight: '800' },
});
