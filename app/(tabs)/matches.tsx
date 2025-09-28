import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface MatchRow {
  id: number;
  user1_id: string;
  user2_id: string;
  created_at: string;
  other?: { id: string; name?: string; avatar_url?: string | null };
}

interface LikeRequestRow {
  id: number;
  liker_id: string;
  liked_id: string;
  created_at: string;
  other?: { id: string; name?: string; avatar_url?: string | null };
}

export default function MatchesScreen() {
  const { currentUser, themeMode } = useStore();
  const [loading, setLoading] = React.useState(true);
  const [matches, setMatches] = React.useState<MatchRow[]>([]);
  const [requests, setRequests] = React.useState<LikeRequestRow[]>([]);
  const [actioningId, setActioningId] = React.useState<number | null>(null);
  const [actionType, setActionType] = React.useState<null | 'accept' | 'reject'>(null);

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
      // incoming like requests
      const { data: likeRows } = await supabase
        .from('likes')
        .select('id, liker_id, liked_id, created_at')
        .eq('liked_id', currentUser.id)
        .order('created_at', { ascending: false });

      // load other users' profiles for both lists in one query
      const matchOthers = (data || []).map(m => (m.user1_id === currentUser.id ? m.user2_id : m.user1_id));
      const requestOthers = (likeRows || []).map(l => l.liker_id);
      const others = Array.from(new Set([...
        matchOthers,
        ...requestOthers,
      ]));
      let profiles: Record<string, { id: string; name?: string; avatar_url?: string | null }> = {};
      if (others.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', others);
        for (const p of profs || []) profiles[p.id] = p as any;
      }

      if (!error && data) {
        const enriched = (data as any[]).map(m => ({
          ...m,
          other: profiles[m.user1_id === currentUser.id ? m.user2_id : m.user1_id]
        })) as MatchRow[];
        setMatches(enriched);
      }
      const enrichedReqs = (likeRows as any[] | null)?.map(l => ({
        ...l,
        other: profiles[l.liker_id],
      })) as LikeRequestRow[] | undefined;
      setRequests(enrichedReqs || []);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  React.useEffect(() => { load(); }, [load]);

  const acceptRequest = async (like: LikeRequestRow) => {
    if (!currentUser?.id) return;
    setActioningId(like.id);
    setActionType('accept');
    try {
      const a = currentUser.id < like.liker_id ? currentUser.id : like.liker_id;
      const b = currentUser.id < like.liker_id ? like.liker_id : currentUser.id;
      const { data: existing } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${a},user2_id.eq.${b}),and(user1_id.eq.${b},user2_id.eq.${a})`)
        .maybeSingle();
      if (!existing) {
        const { error: insErr } = await supabase.from('matches').insert({ user1_id: a, user2_id: b });
        if (insErr) throw insErr;
      }
      // remove the like request
      await supabase.from('likes').delete().eq('id', like.id);
      // refresh lists locally
      setRequests(prev => prev.filter(r => r.id !== like.id));
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to accept request.');
    } finally {
      setActioningId(null);
      setActionType(null);
    }
  };

  const rejectRequest = async (like: LikeRequestRow) => {
    if (!currentUser?.id) return;
    setActioningId(like.id);
    setActionType('reject');
    try {
      await supabase.from('likes').delete().eq('id', like.id);
      setRequests(prev => prev.filter(r => r.id !== like.id));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to reject request.');
    } finally {
      setActioningId(null);
      setActionType(null);
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
      <FlatList
        data={matches}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        ListHeaderComponent={
          <>
            <Text style={[styles.section, { color: theme.text }]}>Requests</Text>
            {requests.length === 0 ? (
              <View style={[styles.center, { paddingVertical: 6 }]}>
                <Text style={[styles.muted, { color: theme.muted }]}>No new requests</Text>
              </View>
            ) : (
              requests.map((r) => (
                <View key={r.id} style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                  {r.other?.avatar_url ? (
                    <Image source={{ uri: r.other.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: theme.avatarBg, borderColor: theme.border }]} />
                  )}
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push(`/profile/${r.other?.id}` as any)}>
                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{r.other?.name || 'Someone'}</Text>
                    <Text style={[styles.sub, { color: theme.sub }]} numberOfLines={1}>Requested on {new Date(r.created_at).toLocaleDateString()}</Text>
                  </TouchableOpacity>
                  <View style={styles.actions}>
                    {!(actioningId === r.id && actionType === 'accept') && (
                      <TouchableOpacity style={[styles.smallBtn, { borderColor: theme.border }]} onPress={() => rejectRequest(r)} disabled={actioningId === r.id} accessibilityLabel="Reject">
                        {actioningId === r.id && actionType === 'reject' ? (
                          <ActivityIndicator size="small" />
                        ) : (
                          <Ionicons name="close" size={16} color={theme.muted} />
                        )}
                      </TouchableOpacity>
                    )}
                    {!(actioningId === r.id && actionType === 'reject') && (
                      <TouchableOpacity style={[styles.smallBtn, { borderColor: theme.border }]} onPress={() => acceptRequest(r)} disabled={actioningId === r.id} accessibilityLabel="Accept">
                        {actioningId === r.id && actionType === 'accept' ? (
                          <ActivityIndicator size="small" />
                        ) : (
                          <Ionicons name="checkmark" size={16} color={theme.accent} />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
            <Text style={[styles.section, { color: theme.text, marginTop: 8 }]}>Matches</Text>
            {matches.length === 0 ? (
              <View style={[styles.center, { paddingVertical: 6 }]}> 
                <Text style={[styles.muted, { color: theme.muted }]}>No matches yet. Keep exploring!</Text>
              </View>
            ) : null}
          </>
        }
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
  actions: { flexDirection: 'row', gap: 8 },
  smallBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  likeCard: { width: 120, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  likeAvatar: { width: 68, height: 68, borderRadius: 34, borderWidth: 1, marginBottom: 8 },
  likeName: { fontWeight: '700', marginBottom: 6 },
  likeBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
  likeBtnText: { fontWeight: '800' },
});
