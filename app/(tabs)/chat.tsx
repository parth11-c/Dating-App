import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
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
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
};

export default function ChatTab() {
  const { currentUser } = useStore();
  const [loading, setLoading] = React.useState(true);
  const [matches, setMatches] = React.useState<MatchRow[]>([]);
  const [lastByMatch, setLastByMatch] = React.useState<Record<number, LastMessage | undefined>>({});
  const [unreadByMatch, setUnreadByMatch] = React.useState<Record<number, number>>({});

  const myId = currentUser?.id;

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
      }
      const enriched = rows.map(m => ({ ...m, other: profileMap[m.user1_id === myId ? m.user2_id : m.user1_id] }));
      setMatches(enriched);

      // 2) For each match, fetch latest message between me and peer
      const pairs = enriched.map(m => ({ matchId: m.id, otherId: m.user1_id === myId ? m.user2_id : m.user1_id }));
      const results = await Promise.all(
        pairs.map(async ({ matchId, otherId }) => {
          const { data: msgs } = await supabase
            .from('messages')
            .select('id, sender_id, recipient_id, body, created_at')
            .or(`and(sender_id.eq.${myId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${myId})`)
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
      const peerIds = pairs.map(p => p.otherId);
      let lastReadMap: Record<string, string | undefined> = {};
      if (peerIds.length) {
        const { data: reads } = await supabase
          .from('message_reads')
          .select('peer_id, last_read_at')
          .eq('user_id', myId)
          .in('peer_id', peerIds);
        for (const r of reads || []) {
          const row = r as any;
          lastReadMap[row.peer_id] = row.last_read_at as string | undefined;
        }
      }
      const unreadCounts = await Promise.all(
        pairs.map(async ({ matchId, otherId }) => {
          const since = lastReadMap[otherId];
          let builder = supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('sender_id', otherId)
            .eq('recipient_id', myId as string);
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

  // Realtime: subscribe to all new messages and update previews if the message is relevant to any match
  React.useEffect(() => {
    if (!myId) return;
    const channel = supabase
      .channel(`messages-previews-${myId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const msg = payload.new as LastMessage;
        // Check if this message belongs to one of our matches
        setLastByMatch(prev => {
          // Find the match whose peer is the other participant
          const otherId = msg.sender_id === myId ? msg.recipient_id : msg.sender_id;
          const m = matches.find(x => (x.user1_id === myId ? x.user2_id : x.user1_id) === otherId);
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
          const otherId = msg.sender_id;
          const m = matches.find(x => (x.user1_id === myId ? x.user2_id : x.user1_id) === otherId);
          if (m) {
            setUnreadByMatch(prev => ({ ...prev, [m.id]: (prev[m.id] || 0) + 1 }));
          }
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
        const row = (payload.new || payload.old) as { user_id: string; peer_id: string; last_read_at?: string };
        if (!row) return;
        const m = matches.find(x => (x.user1_id === myId ? x.user2_id : x.user1_id) === row.peer_id);
        if (m) {
          setUnreadByMatch(prev => ({ ...prev, [m.id]: 0 }));
        }
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [myId, matches]);

  const renderItem = ({ item }: { item: MatchRow }) => {
    const last = lastByMatch[item.id];
    const subtitle = last ? last.body : 'Say hi!';
    const timeStr = last ? new Date(last.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    return (
      <TouchableOpacity style={styles.row} onPress={() => router.push(`/chat/${item.id}` as any)}>
        {item.other?.avatar_url ? (
          <Image source={{ uri: item.other.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar} />
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.rowTop}>
            <Text style={styles.name} numberOfLines={1}>{item.other?.name || 'Match'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {!!timeStr && <Text style={styles.time}>{timeStr}</Text>}
              {!!(unreadByMatch[item.id]) && unreadByMatch[item.id]! > 0 && (
                <View style={styles.unreadBadge}><Text style={styles.unreadText}>{unreadByMatch[item.id]}</Text></View>
              )}
            </View>
          </View>
          <Text style={styles.preview} numberOfLines={1}>{subtitle}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left','right','bottom']}>
      {loading ? (
        <View style={[styles.center, { padding: 16 }]}> 
          <ActivityIndicator color="#fff" />
          <Text style={{ color: '#9aa0a6', marginTop: 8 }}>Loading chats…</Text>
        </View>
      ) : matches.length === 0 ? (
        <View style={[styles.center, { padding: 16 }]}> 
          <Text style={{ color: '#9aa0a6' }}>No conversations yet. Find matches to start chatting.</Text>
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
  container: { flex: 1, backgroundColor: '#0a0a0a' },
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
