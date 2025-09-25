import React from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';

interface ChatMessage {
  id: string;
  match_id: number;
  sender_id: string;
  body: string;
  created_at: string;
}

export default function ChatByMatchScreen() {
  const insets = useSafeAreaInsets();
  const { matchId: matchIdParam } = useLocalSearchParams<{ matchId: string }>();
  const matchId = Number(matchIdParam);
  const { currentUser } = useStore();
  const [peer, setPeer] = React.useState<{ id: string; name?: string; avatar_url?: string | null } | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const listRef = React.useRef<FlatList>(null);

  const myId = currentUser.id;
  const ready = !!myId && Number.isFinite(matchId);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!ready) return;
      // Load match to find peer id
      const { data: m, error } = await supabase.from('matches').select('user1_id, user2_id').eq('id', matchId).single();
      if (!error && m) {
        const otherId = m.user1_id === myId ? m.user2_id : m.user1_id;
        const { data: p } = await supabase.from('profiles').select('id, name, avatar_url').eq('id', otherId).single();
        if (mounted) setPeer(p as any);
      }
    })();
    return () => { mounted = false; };
  }, [matchId, myId, ready]);

  const loadMessages = React.useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('id, match_id, sender_id, body, created_at')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });
    if (!error && data) setMessages(data as ChatMessage[]);
    setLoading(false);
  }, [matchId, ready]);

  React.useEffect(() => { loadMessages(); }, [loadMessages]);

  React.useEffect(() => {
    if (!ready) return;
    const channel = supabase.channel(`messages-match-${matchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const msg = payload.new as ChatMessage;
        if (msg.match_id === matchId) setMessages(prev => [...prev, msg]);
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [matchId, ready]);

  const sendMessage = async () => {
    const body = input.trim();
    if (!body || !ready) return;
    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({ match_id: matchId, sender_id: myId, body });
      if (!error) setInput('');
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const mine = item.sender_id === myId;
    const timeStr = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      <View style={[styles.bubbleRow, mine ? styles.right : styles.left]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={mine ? styles.bubbleTextMine : styles.bubbleTextOther}>{item.body}</Text>
          <Text style={mine ? styles.timeMine : styles.timeOther}>{timeStr}</Text>
        </View>
      </View>
    );
  };

  if (!ready) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#9aa0a6' }}>Invalid chat.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerPeer}>
          {peer?.avatar_url ? <Image source={{ uri: peer.avatar_url }} style={styles.headerAvatar} /> : <View style={styles.headerAvatar} />}
          <Text style={styles.headerTitle} numberOfLines={1}>{peer?.name || 'Chat'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <View style={[styles.center, { padding: 16 }]}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(m) => m.id}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 12 }]}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom > 0 ? 8 : 12 }]}> 
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor="#888"
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity style={[styles.sendBtn, sending && styles.sendBtnDisabled]} onPress={sendMessage} disabled={sending}>
            {sending ? <ActivityIndicator color="#0a0a0a" /> : <Ionicons name="send" size={16} color="#0a0a0a" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#191919' },
  headerPeer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#222' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 },
  list: { paddingHorizontal: 12, paddingTop: 8 },
  bubbleRow: { flexDirection: 'row', marginVertical: 4 },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  bubbleMine: { backgroundColor: '#d1f1ff', borderColor: '#7cc5e6' },
  bubbleOther: { backgroundColor: '#1a1a1a', borderColor: '#333' },
  bubbleTextMine: { color: '#0a0a0a' },
  bubbleTextOther: { color: '#eeeeee' },
  timeMine: { color: '#3f5360', fontSize: 10, marginTop: 4 },
  timeOther: { color: '#9aa0a6', fontSize: 10, marginTop: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#191919' },
  input: { flex: 1, minHeight: 40, maxHeight: 120, color: '#fff', backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  sendBtn: { backgroundColor: '#4da3ff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#2a5b86' },
  sendBtnDisabled: { backgroundColor: '#2b5e91' },
});
