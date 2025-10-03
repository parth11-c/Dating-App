import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store';

type MatchRow = {
  id: number;
  user1_id: string;
  user2_id: string;
  created_at: string;
  other?: { id: string; name?: string; avatar_url?: string | null };
};

type LastMessage = {
  id: string;
  match_id: number;
  sender_id: string;
  body: string;
  created_at: string;
};

export default function ChatTab() {
  const { currentUser, resolvedThemeMode } = useStore();
  const [loading, setLoading] = React.useState(true);
  const [matches, setMatches] = React.useState<MatchRow[]>([]);
  const [lastByMatch, setLastByMatch] = React.useState<Record<number, LastMessage | undefined>>({});
  const [unreadByMatch, setUnreadByMatch] = React.useState<Record<number, number>>({});

  const myId = currentUser?.id;

  const theme = React.useMemo(() => {
    if (resolvedThemeMode === 'light') {
      return {
        bg: '#FFF5F8',
        cardBg: '#ffffff',
        cardBorder: '#f0cfd8',
        avatarBg: '#f3dbe3',
        avatarBorder: '#f0cfd8',
        name: '#1a1a1a',
        time: '#9b7f89',
        preview: '#7d6a72',
        muted: '#9b7f89',
        accent: '#ff5b80',
        unreadBorder: '#f4cdd8',
        unreadText: '#0a0a0a',
      } as const;
    }
    return {
      bg: '#0a0a0a',
      cardBg: '#111',
      cardBorder: '#222',
      avatarBg: '#222',
      avatarBorder: '#333',
      name: '#fff',
      time: '#888',
      preview: '#9aa0a6',
      muted: '#9aa0a6',
      accent: '#ff5b80',
      unreadBorder: '#a83a56',
      unreadText: '#0a0a0a',
    } as const;
  }, [resolvedThemeMode]);

  const load = React.useCallback(async () => {
    if (!myId) return;
    setLoading(true);
    try {
      // 1) Load matches for user and enrich with peer profiles
      const { data, error } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id, created_at')
        .or(`user1_id.eq.${myId},user2_id.eq.${myId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data || []) as MatchRow[];
      const others = Array.from(new Set(rows.map(m => (m.user1_id === myId ? m.user2_id : m.user1_id))));
      let profileMap: Record<string, { id: string; name?: string; avatar_url?: string | null }> = {};
      if (others.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', others);
        for (const p of profs || []) profileMap[(p as any).id] = p as any;
        // Fallback: fill avatar_url from first photo if missing
        try {
          const { data: photos } = await supabase
            .from('photos')
            .select('user_id, image_url, created_at')
            .in('user_id', others)
            .order('created_at', { ascending: false });
          const firstPhotoById: Record<string, string | undefined> = {};
          for (const ph of (photos as any[]) || []) {
            const uid = (ph as any).user_id as string;
            if (!firstPhotoById[uid]) firstPhotoById[uid] = (ph as any).image_url as string;
          }
          for (const uid of Object.keys(profileMap)) {
            if (!profileMap[uid]?.avatar_url) profileMap[uid].avatar_url = firstPhotoById[uid] || null;
          }
        } catch {}
      }
      const enriched = rows.map(m => ({ ...m, other: profileMap[m.user1_id === myId ? m.user2_id : m.user1_id] }));
      setMatches(enriched);

      // 2) For each match, fetch latest message by match_id
      const pairs = enriched.map(m => ({ matchId: m.id }));
      const results = await Promise.all(
        pairs.map(async ({ matchId }) => {
          const { data: msgs } = await supabase
            .from('messages')
            .select('id, match_id, sender_id, body, created_at')
            .eq('match_id', matchId)
            .order('created_at', { ascending: false })
            .limit(1);
          return { matchId, last: (msgs && msgs[0]) as LastMessage | undefined };
        })
      );
      setLastByMatch(prev => {
        const next = { ...prev } as Record<number, LastMessage | undefined>;
        for (const r of results) next[r.matchId] = r.last;
        return next;
      });

      // 3) Load last read timestamps per peer and compute unread counts
      // 3) Load last read per match (message_reads keyed by match_id, user_id)
      const matchIds = pairs.map(p => p.matchId);
      let lastReadMap: Record<number, string | undefined> = {};
      if (matchIds.length) {
        try {
          const { data: reads } = await supabase
            .from('message_reads')
            .select('match_id, last_read_at')
            .eq('user_id', myId)
            .in('match_id', matchIds);
          for (const r of reads || []) {
            const row = r as any;
            lastReadMap[row.match_id as number] = row.last_read_at as string | undefined;
          }
        } catch {}
      }
      const unreadCounts = await Promise.all(
        pairs.map(async ({ matchId }) => {
          const since = lastReadMap[matchId];
          let builder = supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('match_id', matchId)
            .neq('sender_id', myId as string);
          if (since) builder = builder.gt('created_at', since);
          const { count } = await builder;
          return { matchId, count: count || 0 };
        })
      );
      setUnreadByMatch(prev => {
        const next = { ...prev } as Record<number, number>;
        for (const r of unreadCounts) next[r.matchId] = r.count;
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, [myId]);

  React.useEffect(() => { load(); }, [load]);

  // Also refresh when the tab/screen becomes focused
  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  // Realtime: refresh list when matches change involving me
  React.useEffect(() => {
    if (!myId) return;
    const channel = supabase
      .channel(`matches-previews-${myId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, (payload: any) => {
        const row = (payload.new || payload.old) as { user1_id: string; user2_id: string } | undefined;
        if (!row) return;
        if (row.user1_id === myId || row.user2_id === myId) {
          load();
        }
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [myId, load]);

  // Realtime: subscribe to all new messages and update previews if the message belongs to one of our matches
  React.useEffect(() => {
    if (!myId) return;
    const channel = supabase
      .channel(`messages-previews-${myId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const msg = payload.new as LastMessage;
        // Check if this message belongs to one of our matches
        setLastByMatch(prev => {
          const m = matches.find(x => x.id === msg.match_id);
          if (!m) return prev;
          // Only update if newer
          const old = prev[m.id];
          if (!old || new Date(msg.created_at).getTime() >= new Date(old.created_at).getTime()) {
            return { ...prev, [m.id]: msg };
          }
          return prev;
        });
        // Increment unread if incoming
        if (msg.sender_id !== myId) {
          const m = matches.find(x => x.id === msg.match_id);
          if (m) setUnreadByMatch(prev => ({ ...prev, [m.id]: (prev[m.id] || 0) + 1 }));
        }
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [myId, matches]);

  // Realtime: clear unread counts when this user's message_reads updates
  React.useEffect(() => {
    if (!myId) return;
    const channel = supabase
      .channel(`message-reads-${myId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reads', filter: `user_id=eq.${myId}` }, (payload: any) => {
        const row = (payload.new || payload.old) as { user_id: string; match_id: number; last_read_at?: string };
        if (!row) return;
        const m = matches.find(x => x.id === row.match_id);
        if (m) setUnreadByMatch(prev => ({ ...prev, [m.id]: 0 }));
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [myId, matches]);

  const renderItem = ({ item }: { item: MatchRow }) => {
    const last = lastByMatch[item.id];
    const subtitle = last ? last.body : 'Say hi!';
    const timeStr = last ? new Date(last.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    return (
      <TouchableOpacity style={[styles.row, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} onPress={() => router.push(`/chat/${item.id}` as any)}>
        {item.other?.avatar_url ? (
          <Image source={{ uri: item.other.avatar_url }} style={[styles.avatar, { backgroundColor: theme.avatarBg, borderColor: theme.avatarBorder }]} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.avatarBg, borderColor: theme.avatarBorder }]} />
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.rowTop}>
            <Text style={[styles.name, { color: theme.name }]} numberOfLines={1}>{item.other?.name || 'Match'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {!!timeStr && <Text style={[styles.time, { color: theme.time }]}>{timeStr}</Text>}
              {!!(unreadByMatch[item.id]) && unreadByMatch[item.id]! > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: theme.accent, borderColor: theme.unreadBorder }]}><Text style={[styles.unreadText, { color: theme.unreadText }]}>{unreadByMatch[item.id]}</Text></View>
              )}
            </View>
          </View>
          <Text style={[styles.preview, { color: theme.preview }]} numberOfLines={1}>{subtitle}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['left','right','bottom']}>
      {loading ? (
        <View style={[styles.center, { padding: 16 }]}> 
          <ActivityIndicator color={resolvedThemeMode === 'light' ? theme.accent : '#fff'} />
          <Text style={{ color: theme.muted, marginTop: 8 }}>Loading chats…</Text>
        </View>
      ) : matches.length === 0 ? (
        <View style={[styles.center, { padding: 16 }]}> 
          <Text style={{ color: theme.muted }}>No conversations yet. Find matches to start chatting.</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  name: { color: '#fff', fontWeight: '700', flex: 1 },
  time: { color: '#888', fontSize: 12, marginLeft: 8 },
  preview: { color: '#9aa0a6', fontSize: 12, marginTop: 2 },
  unreadBadge: { backgroundColor: '#ff5b80', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: '#a83a56' },
  unreadText: { color: '#0a0a0a', fontSize: 12, fontWeight: '800' },
});
