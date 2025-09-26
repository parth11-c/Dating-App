import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface Interest { id: number; name: string }
type Gender = 'male' | 'female' | 'non-binary' | 'other' | null;
type PrefGender = 'female' | 'male' | 'everyone' | null;

type Candidate = {
  id: string;
  name: string;
  bio?: string | null;
  gender: Gender;
  preferred_gender?: PrefGender;
  date_of_birth?: string | null;
  avatar_url?: string | null;
  location?: string | null;
  photos?: { image_url: string }[];
  user_interests?: { interest_id: number }[];
};

export default function InterestsScreen() {
  const { currentUser } = useStore();
  const [loading, setLoading] = React.useState(true);
  const [interests, setInterests] = React.useState<Interest[]>([]);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  // Suggestions state
  const [suggestionsLoading, setSuggestionsLoading] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<Array<Candidate & { score: number; sharedCount: number }>>([]);
  const [myProfile, setMyProfile] = React.useState<{ gender: Gender; preferred_gender: PrefGender; location?: string | null } | null>(null);

  const load = React.useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [{ data: ints }, { data: mine }, { data: me }] = await Promise.all([
        supabase.from('interests').select('id, name').order('name'),
        supabase.from('user_interests').select('interest_id').eq('user_id', currentUser.id),
        supabase.from('profiles').select('gender, preferred_gender, location').eq('id', currentUser.id).maybeSingle(),
      ]);
      setInterests((ints as any[]) || []);
      setSelected(new Set(((mine as any[]) || []).map(r => r.interest_id)));
      setMyProfile((me as any) || null);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  React.useEffect(() => { load(); }, [load]);

  // Load suggestions whenever my profile or selected interests change
  const loadSuggestions = React.useCallback(async () => {
    if (!currentUser?.id) return;
    setSuggestionsLoading(true);
    try {
      // Fetch candidates with nested photos and their interests
      // Apply preferred gender filter if set
      let query = supabase
        .from('profiles')
        .select('id, name, bio, gender, preferred_gender, date_of_birth, avatar_url, location, photos ( image_url ), user_interests ( interest_id )')
        .neq('id', currentUser.id);

      const pref = myProfile?.preferred_gender || null;
      if (pref && pref !== 'everyone') {
        query = query.eq('gender', pref);
      }

      const { data: rows } = await query.order('created_at', { ascending: false });
      const candidates: Candidate[] = (rows as any[]) || [];

      const myInterestIds = selected;
      const myGender = myProfile?.gender || null;
      const myLoc = (myProfile?.location || '')?.trim().toLowerCase();

      // Scoring function
      const scored = candidates
        .filter(p => {
          // Respect the other user's preference if provided
          if (p.preferred_gender && p.preferred_gender !== 'everyone') {
            if (!myGender) return false;
            return p.preferred_gender === myGender;
          }
          return true;
        })
        .map((p) => {
          const others = new Set((p.user_interests || []).map(ui => ui.interest_id));
          let sharedCount = 0;
          for (const id of myInterestIds) if (others.has(id)) sharedCount++;
          const sameLocation = !!(myLoc && (p.location || '').trim().toLowerCase() === myLoc);

          // Base scoring: shared interests weight more than location
          let score = sharedCount * 3;
          if (sameLocation) score += 5;

          return { ...p, score, sharedCount };
        })
        .filter(p => p.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 50);

      if (scored.length === 0) {
        // Fallback: choose 2–3 random profiles honoring preferred gender
        const shuffled = [...candidates].sort(() => Math.random() - 0.5);
        const fallback = shuffled.slice(0, Math.min(3, shuffled.length)).map(p => ({ ...p, score: 0, sharedCount: 0 }));
        setSuggestions(fallback);
      } else {
        setSuggestions(scored);
      }
    } finally {
      setSuggestionsLoading(false);
    }
  }, [currentUser?.id, myProfile?.preferred_gender, myProfile?.gender, myProfile?.location, selected]);

  React.useEffect(() => { loadSuggestions(); }, [loadSuggestions]);

  const likeProfile = async (otherId: string) => {
    try {
      if (!currentUser?.id) return;
      await supabase.from('likes').insert({ liker_id: currentUser.id, liked_id: otherId });
    } catch {}
  };

  // Removed toggle UI for interests; selection is read from DB only

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
      {/* Suggestions */}
      <Text style={[styles.header, { marginTop: 6 }]}>Suggested for you</Text>
      {suggestionsLoading ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }}>
          <ActivityIndicator color="#fff" />
          <Text style={{ color: '#9aa0a6', marginTop: 6 }}>Finding similar profiles…</Text>
        </View>
      ) : suggestions.length === 0 ? (
        <Text style={{ color: '#9aa0a6', paddingHorizontal: 12, paddingBottom: 16 }}>Choose a few interests to get better suggestions.</Text>
      ) : (
        <FlatList
          data={suggestions.slice(0, 3)}
          keyExtractor={(p) => p.id}
          horizontal
          style={{ paddingHorizontal: 12, paddingBottom: 16 }}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => <SuggestionCard item={item} onLike={likeProfile} />}
        />
      )}
      <Text style={styles.disclaimer}>Based on your profile and interests</Text>
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
  suggCard: {
    width: 240,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  suggImageWrap: { margin: 12, borderRadius: 16, overflow: 'hidden' },
  suggImage: { width: '100%', height: 240, backgroundColor: '#e9eaee' },
  suggBody: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 2 },
  suggTitle: { color: '#111', fontWeight: '900', fontSize: 16 },
  suggMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  suggMetaLeft: { color: '#111', fontWeight: '800' },
  heartBtn: { borderWidth: 1, borderColor: '#ddd', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8 },
  heartIcon: { color: '#111' },
  disclaimer: { color: '#9aa0a6', fontSize: 12, paddingHorizontal: 16, paddingBottom: 12 },
});

// Chip UI removed from this screen

function ageFromDob(dobIso?: string | null) {
  if (!dobIso) return undefined;
  const dob = new Date(dobIso);
  if (isNaN(dob.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

function SuggestionCard({ item, onLike }: { item: Candidate & { score: number; sharedCount: number }; onLike: (id: string) => void }) {
  const cover = item.photos?.[0]?.image_url || item.avatar_url || undefined;
  const age = ageFromDob(item.date_of_birth);
  const genderInitial = item.gender ? (item.gender[0] || '').toUpperCase() : undefined;
  return (
    <View style={styles.suggCard}>
      <TouchableOpacity onPress={() => router.push(`/profile/${item.id}` as any)} activeOpacity={0.9}>
        <View style={styles.suggImageWrap}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.suggImage} />
          ) : (
            <View style={[styles.suggImage, { alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="person" size={36} color="#999" />
            </View>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.suggBody}>
        <Text style={styles.suggTitle} numberOfLines={1}>{item.name}</Text>
        <View style={styles.suggMetaRow}>
          <Text style={styles.suggMetaLeft}>{genderInitial ? `${genderInitial}` : ''}{typeof age === 'number' ? `, ${age}` : ''}</Text>
          <TouchableOpacity style={styles.heartBtn} onPress={() => onLike(item.id)}>
            <Ionicons name="heart-outline" size={18} style={styles.heartIcon as any} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
