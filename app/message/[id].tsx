import React from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useStore } from '@/store';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
}

export default function MessageScreen() {
  const insets = useSafeAreaInsets();
  const { id: otherId } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useStore();
  const [otherProfile, setOtherProfile] = React.useState<{ name?: string; avatar_url?: string } | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const listRef = React.useRef<FlatList>(null);

  const myId = currentUser.id;
  const peerId = otherId || '';
  const ready = !!myId && !!peerId;

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!peerId) return;
      const { data } = await supabase.from('profiles').select('name, avatar_url').eq('id', peerId).single();
      if (mounted) setOtherProfile(data as any);
    })();
    return () => { mounted = false; };
  }, [peerId]);

  const loadMessages = React.useCallback(async () => {
    if (!ready) return;
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, body, created_at')
      .or(`and(sender_id.eq.${myId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${myId})`)
      .order('created_at', { ascending: true });
    if (!error && data) setMessages(data as ChatMessage[]);
  }, [myId, peerId, ready]);

  React.useEffect(() => { loadMessages(); }, [loadMessages]);

  React.useEffect(() => {
    if (!ready) return;
    // Realtime subscription for new messages in this conversation
    const channel = supabase.channel(`messages-${myId}-${peerId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const msg = payload.new as ChatMessage;
        const match = (msg.sender_id === myId && msg.recipient_id === peerId) || (msg.sender_id === peerId && msg.recipient_id === myId);
        if (match) setMessages(prev => [...prev, msg]);
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [myId, peerId, ready]);

  const sendMessage = async () => {
    const body = input.trim();
    if (!body || !ready) return;
    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({ sender_id: myId, recipient_id: peerId, body });
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerPeer} onPress={() => router.push(`/profile/${peerId}` as any)}>
          {otherProfile?.avatar_url ? (
            <Image source={{ uri: otherProfile.avatar_url }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatar} />
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>{otherProfile?.name || 'Chat'}</Text>
        </TouchableOpacity>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(m) => m.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 12 }]}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        />
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
