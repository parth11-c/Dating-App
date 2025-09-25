import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store';

interface Interest { id: number; name: string }

export default function InterestsScreen() {
  const { currentUser } = useStore();
  const [loading, setLoading] = React.useState(true);
  const [interests, setInterests] = React.useState<Interest[]>([]);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [savingIds, setSavingIds] = React.useState<Set<number>>(new Set());

  const load = React.useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [{ data: ints }, { data: mine }] = await Promise.all([
        supabase.from('interests').select('id, name').order('name'),
        supabase.from('user_interests').select('interest_id').eq('user_id', currentUser.id)
      ]);
      setInterests((ints as any[]) || []);
      setSelected(new Set(((mine as any[]) || []).map(r => r.interest_id)));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  React.useEffect(() => { load(); }, [load]);

  const toggle = async (interestId: number) => {
    if (!currentUser?.id) return;
    const next = new Set(selected);
    const isSelected = next.has(interestId);
    setSavingIds(prev => new Set(prev).add(interestId));
    try {
      if (isSelected) {
        const { error } = await supabase.from('user_interests').delete().eq('user_id', currentUser.id).eq('interest_id', interestId);
        if (!error) next.delete(interestId);
      } else {
        const { error } = await supabase.from('user_interests').insert({ user_id: currentUser.id, interest_id: interestId });
        if (!error) next.add(interestId);
      }
      setSelected(next);
    } finally {
      setSavingIds(prev => { const p = new Set(prev); p.delete(interestId); return p; });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#fff" />
        <Text style={{ color: '#9aa0a6', marginTop: 8 }}>Loading interests…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Select your interests</Text>
      <FlatList
        data={interests}
        keyExtractor={(i) => String(i.id)}
        numColumns={2}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        columnWrapperStyle={{ gap: 10 }}
        renderItem={({ item }) => {
          const isOn = selected.has(item.id);
          const saving = savingIds.has(item.id);
          return (
            <TouchableOpacity style={[styles.pill, isOn && styles.pillActive]} onPress={() => toggle(item.id)} disabled={saving}>
              <Text style={[styles.pillText, isOn && styles.pillTextActive]}>{item.name}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { color: '#fff', fontSize: 18, fontWeight: '700', paddingHorizontal: 12, paddingTop: 12 },
  pill: { flex: 1, backgroundColor: '#0f0f10', borderWidth: 1, borderColor: '#1f1f22', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  pillActive: { backgroundColor: '#1a2b3d', borderColor: '#2a5b86' },
  pillText: { color: '#9aa0a6', fontWeight: '700' },
  pillTextActive: { color: '#cce6ff' },
});
