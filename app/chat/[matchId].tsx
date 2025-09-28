import React from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
}

export default function ChatByMatchScreen() {
  const insets = useSafeAreaInsets();
  const { matchId: matchIdParam } = useLocalSearchParams<{ matchId: string }>();
  const matchId = Number(matchIdParam);
  const { currentUser, resolvedThemeMode } = useStore();
  const [peer, setPeer] = React.useState<{ id: string; name?: string; avatar_url?: string | null } | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const listRef = React.useRef<FlatList>(null);
  const [peerOnline, setPeerOnline] = React.useState(false);
  const [peerTyping, setPeerTyping] = React.useState(false);
  const typingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const myId = currentUser.id;
  const ready = !!myId && Number.isFinite(matchId);

  const theme = React.useMemo(() => {
    if (resolvedThemeMode === 'light') {
      return {
        bg: '#FFF5F8', text: '#1a1a1a', sub: '#6b5b61', muted: '#7d6a72',
        headerIcon: '#1a1a1a', headerBorder: '#f0cfd8', avatarBg: '#f3dbe3',
        bubbleMineBg: '#d1f1ff', bubbleMineBorder: '#7cc5e6', bubbleMineText: '#0a0a0a', timeMine: '#3f5360',
        bubbleOtherBg: '#ffffff', bubbleOtherBorder: '#f0cfd8', bubbleOtherText: '#1a1a1a', timeOther: '#7d6a72',
        inputBg: '#ffffff', inputBorder: '#f0cfd8', inputText: '#1a1a1a', placeholder: '#9b7f89',
        barBorder: '#f0cfd8',
        accent: '#ff5b80', sendBorder: '#f4cdd8', sendText: '#fff',
      } as const;
    }
    return {
      bg: '#0a0a0a', text: '#fff', sub: '#9aa0a6', muted: '#9aa0a6',
      headerIcon: '#fff', headerBorder: '#191919', avatarBg: '#222',
      bubbleMineBg: '#d1f1ff', bubbleMineBorder: '#7cc5e6', bubbleMineText: '#0a0a0a', timeMine: '#3f5360',
      bubbleOtherBg: '#1a1a1a', bubbleOtherBorder: '#333', bubbleOtherText: '#eeeeee', timeOther: '#9aa0a6',
      inputBg: '#111', inputBorder: '#222', inputText: '#fff', placeholder: '#888',
      barBorder: '#191919',
      accent: '#4da3ff', sendBorder: '#2a5b86', sendText: '#0a0a0a',
    } as const;
  }, [resolvedThemeMode]);

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
    if (!ready || !peer?.id) return;
    setLoading(true);
    const otherId = peer.id;
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, body, created_at')
      .or(`and(sender_id.eq.${myId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${myId})`)
      .order('created_at', { ascending: true });
    if (!error && data) setMessages(data as ChatMessage[]);
    setLoading(false);
  }, [ready, peer?.id, myId]);

  React.useEffect(() => { loadMessages(); }, [loadMessages]);

  React.useEffect(() => {
    if (!ready || !peer?.id) return;
    const otherId = peer.id;
    const channel = supabase.channel(`messages-${myId}-${otherId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const msg = payload.new as ChatMessage;
        const match = (msg.sender_id === myId && msg.recipient_id === otherId) || (msg.sender_id === otherId && msg.recipient_id === myId);
        if (match) setMessages(prev => [...prev, msg]);
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [ready, peer?.id, myId]);

  // Presence and typing indicators (broadcast + presence)
  React.useEffect(() => {
    if (!ready || !peer?.id) return;
    const otherId = peer.id;
    const pairKey = myId < otherId ? `${myId}-${otherId}` : `${otherId}-${myId}`;
    const channel = supabase.channel(`chat-meta-${pairKey}`, {
      config: { presence: { key: myId } }
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ user_id: string }>();
      const onlineIds = Object.keys(state);
      setPeerOnline(onlineIds.includes(otherId));
    });

    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload?.from === otherId) {
        setPeerTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 1500);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: myId });
      }
    });

    return () => { channel.unsubscribe(); };
  }, [ready, peer?.id, myId]);

  // Emit typing events when user types
  const notifyTyping = React.useMemo(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (val: string) => {
      if (!ready || !peer?.id) return;
      const otherId = peer.id;
      const pairKey = myId < otherId ? `${myId}-${otherId}` : `${otherId}-${myId}`;
      const channel = supabase.channel(`chat-meta-${pairKey}`);
      // fire and forget broadcast (short lived channel instance)
      channel.subscribe(() => {
        channel.send({ type: 'broadcast', event: 'typing', payload: { from: myId, typing: true } });
        setTimeout(() => channel.unsubscribe(), 2000);
      });
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { /* stop indicator auto clears on receiver */ }, 1200);
    };
  }, [ready, peer?.id, myId]);

  const sendMessage = async () => {
    const body = input.trim();
    if (!body || !ready || !peer?.id) return;
    const otherId = peer.id;
    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({ sender_id: myId, recipient_id: otherId, body });
      if (!error) setInput('');
    } finally {
      setSending(false);
    }
  };

  // Mark messages as read when viewing the chat
  const markRead = React.useCallback(async () => {
    if (!ready || !peer?.id) return;
    const now = new Date().toISOString();
    await supabase
      .from('message_reads')
      .upsert({ user_id: myId, peer_id: peer.id, last_read_at: now }, { onConflict: 'user_id,peer_id' });
  }, [ready, peer?.id, myId]);

  React.useEffect(() => { markRead(); }, [markRead, messages.length]);

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const mine = item.sender_id === myId;
    const timeStr = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      <View style={[styles.bubbleRow, mine ? styles.right : styles.left]}>
        <View style={[styles.bubble, mine ? { backgroundColor: theme.bubbleMineBg, borderColor: theme.bubbleMineBorder } : { backgroundColor: theme.bubbleOtherBg, borderColor: theme.bubbleOtherBorder }]}>
          <Text style={mine ? { color: theme.bubbleMineText } : { color: theme.bubbleOtherText }}>{item.body}</Text>
          <Text style={mine ? { color: theme.timeMine, fontSize: 10, marginTop: 4 } : { color: theme.timeOther, fontSize: 10, marginTop: 4 }}>{timeStr}</Text>
        </View>
      </View>
    );
  };

  if (!ready) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }]} edges={['top','left','right','bottom']}>
        <StatusBar style={resolvedThemeMode === 'light' ? 'dark' : 'light'} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <StatusBar style={resolvedThemeMode === 'light' ? 'dark' : 'light'} />
      <View style={[styles.header, { borderBottomColor: theme.headerBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={20} color={theme.headerIcon} />
        </TouchableOpacity>
        <View style={styles.headerPeer}>
          {peer?.avatar_url ? <Image source={{ uri: peer.avatar_url }} style={[styles.headerAvatar, { backgroundColor: theme.avatarBg }]} /> : <View style={[styles.headerAvatar, { backgroundColor: theme.avatarBg }]} />}
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{peer?.name || 'Chat'}</Text>
            <Text style={[styles.headerSub, { color: theme.sub }]} numberOfLines={1}>{peerTyping ? 'Typing…' : (peerOnline ? 'Online' : 'Offline')}</Text>
          </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <View style={[styles.center, { padding: 16 }]}> 
            <ActivityIndicator color={resolvedThemeMode === 'light' ? theme.accent : '#fff'} />
          </View>
        ) : messages.length === 0 ? (
          <View style={[styles.center, { padding: 16 }]}> 
            <Text style={{ color: theme.muted }}>Start the conversation</Text>
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
        <View style={[styles.inputBar, { paddingBottom: insets.bottom > 0 ? 8 : 12, borderTopColor: theme.barBorder }]}> 
          <TextInput
            style={[styles.input, { color: theme.inputText, backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}
            placeholder="Message..."
            placeholderTextColor={theme.placeholder}
            value={input}
            onChangeText={(t) => { setInput(t); notifyTyping(t); }}
            multiline
          />
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: theme.accent, borderColor: theme.sendBorder }, sending && styles.sendBtnDisabled]} onPress={sendMessage} disabled={sending}>
            {sending ? <ActivityIndicator color={theme.sendText} /> : <Ionicons name="send" size={16} color={theme.sendText} />}
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
  headerSub: { color: '#9aa0a6', fontSize: 12 },
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
