import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image, Animated } from 'react-native';
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
  const { currentUser, resolvedThemeMode } = useStore();
  const [loading, setLoading] = React.useState(true);
  const [interests, setInterests] = React.useState<Interest[]>([]);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  // Suggestions state
  const [suggestionsLoading, setSuggestionsLoading] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<Array<Candidate & { score: number; sharedCount: number }>>([]);
  const [myProfile, setMyProfile] = React.useState<{ gender: Gender; preferred_gender: PrefGender; location?: string | null } | null>(null);
  const [likingId, setLikingId] = React.useState<string | null>(null);
  const [likedIds, setLikedIds] = React.useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = React.useState(3);
  const scrollX = React.useRef(new Animated.Value(0)).current;

  const theme = useMemo(() => {
    if (resolvedThemeMode === 'light') {
      return {
        bg: '#FFF5F8',
        card: '#ffffff',
        border: '#f0cfd8',
        text: '#1a1a1a',
        muted: '#7d6a72',
        sub: '#6b5b61',
        chipBg: '#fff',
        chipBorder: '#edd0d9',
        chipText: '#5a4e53',
        accent: '#ff5b80',
        accentSubtle: '#ffe9f0',
        imageBg: '#f3dbe3',
      } as const;
    }
    return {
      bg: '#0a0a0a',
      card: '#111',
      border: '#222',
      text: '#fff',
      muted: '#9aa0a6',
      sub: '#888',
      chipBg: '#1a1a1a',
      chipBorder: '#2a2a2d',
      chipText: '#ccc',
      accent: '#ff5b80',
      accentSubtle: '#1a1a1a',
      imageBg: '#1a1a1a',
    } as const;
  }, [resolvedThemeMode]);

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

       const scored = candidates
        .filter(p => {
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
      if (!currentUser?.id || likingId) return;
      setLikingId(otherId);
       const { data: existing } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', currentUser.id)
        .eq('liked_id', otherId)
        .maybeSingle();
      if (existing) {
        router.push('/(tabs)/matches' as any);
        return;
      }
      // Insert like
      const { error } = await supabase.from('likes').insert({ liker_id: currentUser.id, liked_id: otherId });
      if (error) return;
      // Mark locally as liked
      setLikedIds(prev => new Set(prev).add(otherId));
      // Check mutual
      const { data: mutual } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', otherId)
        .eq('liked_id', currentUser.id)
        .maybeSingle();
      if (mutual) {
        // Ensure a match row exists (order-invariant pair)
        try {
          const a = currentUser.id < otherId ? currentUser.id : otherId;
          const b = currentUser.id < otherId ? otherId : currentUser.id;
          const { data: existingMatch } = await supabase
            .from('matches')
            .select('id')
            .or(`and(user1_id.eq.${a},user2_id.eq.${b}),and(user1_id.eq.${b},user2_id.eq.${a})`)
            .maybeSingle();
          if (!existingMatch) {
            await supabase.from('matches').insert({ user1_id: a, user2_id: b });
          }
        } catch {}
        router.push('/(tabs)/matches' as any);
      }
    } finally {
      setLikingId(null);
    }
  };

  // Removed toggle UI for interests; selection is read from DB only

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }]} edges={['left','right','bottom']}>
        <ActivityIndicator color={resolvedThemeMode === 'light' ? theme.accent : '#fff'} />
        <Text style={{ color: theme.muted, marginTop: 8 }}>Loading interests…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['left','right','bottom']}>
      {/* Section Header */}
      <View style={[styles.headerWrap]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Handpicked for you</Text>
        <Text style={[styles.headerSub, { color: theme.muted }]}>Curated matches based on your vibe and interests</Text>
      </View>
      {suggestionsLoading ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }}>
          <ActivityIndicator color={resolvedThemeMode === 'light' ? theme.accent : '#fff'} />
          <Text style={{ color: theme.muted, marginTop: 6 }}>Finding similar profiles…</Text>
        </View>
      ) : suggestions.length === 0 ? (
        <Text style={{ color: theme.muted, paddingHorizontal: 12, paddingBottom: 16 }}>Choose a few interests to get better suggestions.</Text>
      ) : (
        <Animated.FlatList
          data={suggestions.slice(0, visibleCount)}
          keyExtractor={(p) => p.id}
          horizontal
          style={{ paddingHorizontal: 12, paddingBottom: 8 }}
          contentContainerStyle={{ gap: 16 }}
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToAlignment="center"
          snapToInterval={276}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          renderItem={({ item, index }) => {
            // Resolve shared interest names for chips
            const myIds = new Set(Array.from(selected));
            const otherIds = new Set((item.user_interests || []).map(ui => ui.interest_id));
            const sharedIds: number[] = [];
            for (const id of myIds) if (otherIds.has(id)) sharedIds.push(id);
            const idToName = new Map(interests.map(i => [i.id, i.name] as const));
            const sharedNames = sharedIds.map(id => idToName.get(id)).filter(Boolean) as string[];
            const inputRange = [ (index-1)*276, index*276, (index+1)*276 ];
            const scale = scrollX.interpolate({ inputRange, outputRange: [0.94, 1, 0.94], extrapolate: 'clamp' });
            return (
              <Animated.View style={{ transform: [{ scale }] }}>
                <SuggestionCard
                  item={item}
                  sharedNames={sharedNames.slice(0, 4)}
                  onLike={likeProfile}
                  isLiking={likingId === item.id}
                  liked={likedIds.has(item.id)}
                />
              </Animated.View>
            );
          }}
        />
      )}
      {suggestions.length > visibleCount ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          <TouchableOpacity style={[styles.seeMoreBtn, { backgroundColor: resolvedThemeMode === 'light' ? theme.card : '#1f1f1f', borderColor: theme.border }]} onPress={() => setVisibleCount(v => Math.min(v + 3, suggestions.length))}>
            <Text style={[styles.seeMoreText, { color: resolvedThemeMode === 'light' ? theme.text : '#fff' }]}>See more like this</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { color: '#fff', fontSize: 18, fontWeight: '700', paddingHorizontal: 12, paddingTop: 12 },
  headerWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  headerTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.2 },
  headerSub: { marginTop: 10,marginBottom: 28 },
  pill: { flex: 1, backgroundColor: '#0f0f10', borderWidth: 1, borderColor: '#1f1f22', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  pillActive: { backgroundColor: '#1a2b3d', borderColor: '#2a5b86' },
  pillText: { color: '#9aa0a6', fontWeight: '700' },
  pillTextActive: { color: '#cce6ff' },
  suggCard: {
    width: 260,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  suggImageWrap: { margin: 12, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  suggImage: { width: '100%', height: 240, backgroundColor: '#1a1a1a' },
  gradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 },
  imageFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, backgroundColor: 'rgba(0,0,0,0.25)' },
  suggBody: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 2 },
  suggTitle: { fontWeight: '900', fontSize: 17 },
  suggMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  suggMetaLeft: { fontWeight: '800' },
  heartBtn: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8 },
  heartIcon: { color: '#ff5b80' },
  disclaimer: { fontSize: 12, paddingHorizontal: 16, paddingBottom: 12 },
  locRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  locText: { fontSize: 12, fontWeight: '600' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  chipText: { fontWeight: '700', fontSize: 12 },
  bioText: { marginTop: 8 },
  badge: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, position: 'absolute', left: 12, top: 12 },
  badgeText: { fontWeight: '800', fontSize: 12 },
  seeMoreBtn: { alignSelf: 'flex-start', backgroundColor: '#1f1f1f', borderColor: '#333', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  seeMoreText: { fontWeight: '800' },
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

function SuggestionCard({ item, sharedNames = [], onLike, isLiking, liked }: { item: Candidate & { score: number; sharedCount: number }; sharedNames?: string[]; onLike: (id: string) => void; isLiking?: boolean; liked?: boolean }) {
  const { resolvedThemeMode } = useStore();
  const theme = useMemo(() => {
    if (resolvedThemeMode === 'light') {
      return {
        card: '#ffffff', border: '#f0cfd8', text: '#1a1a1a', muted: '#7d6a72', sub: '#6b5b61', accent: '#ff5b80', chipBg: '#fff', chipBorder: '#edd0d9', chipText: '#5a4e53', imageBg: '#f3dbe3'
      } as const;
    }
    return { card: '#111', border: '#222', text: '#fff', muted: '#9aa0a6', sub: '#888', accent: '#ff5b80', chipBg: '#1a1a1a', chipBorder: '#2a2a2d', chipText: '#ccc', imageBg: '#1a1a1a' } as const;
  }, [resolvedThemeMode]);
  const cover = item.photos?.[0]?.image_url || item.avatar_url || undefined;
  const age = ageFromDob(item.date_of_birth);
  const genderInitial = item.gender ? (item.gender[0] || '').toUpperCase() : undefined;
  return (
    <View style={[styles.suggCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <TouchableOpacity onPress={() => router.push(`/profile/${item.id}` as any)} activeOpacity={0.9}>
        <View style={styles.suggImageWrap}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.suggImage} />
          ) : (
            <View style={[styles.suggImage, { backgroundColor: theme.imageBg, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="person" size={36} color={theme.sub} />
            </View>
          )}
          <View style={styles.imageFade} />
          <View style={[styles.badge, { backgroundColor: resolvedThemeMode === 'light' ? '#ffffffcc' : 'rgba(255,255,255,0.06)', borderColor: resolvedThemeMode === 'light' ? theme.border : 'rgba(255,255,255,0.12)' }]}>
            <Text style={[styles.badgeText, { color: resolvedThemeMode === 'light' ? theme.text : '#e6e6e6' }]}>{item.sharedCount > 0 ? `${item.sharedCount} shared interests` : 'Suggested'}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.suggBody}>
        <Text style={[styles.suggTitle, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
        <View style={styles.suggMetaRow}>
          <Text style={[styles.suggMetaLeft, { color: resolvedThemeMode === 'light' ? theme.sub : '#ddd' }]}>{genderInitial ? `${genderInitial}` : ''}{typeof age === 'number' ? `, ${age}` : ''}</Text>
          <TouchableOpacity style={[styles.heartBtn, { backgroundColor: resolvedThemeMode === 'light' ? '#fff' : '#1a1a1a', borderColor: resolvedThemeMode === 'light' ? theme.border : '#333' }, isLiking ? { opacity: 0.7 } : null]} onPress={() => onLike(item.id)} disabled={!!isLiking} accessibilityLabel="Like">
            {isLiking ? (
              <ActivityIndicator color={theme.accent} />
            ) : liked ? (
              <Ionicons name="heart" size={18} color={theme.accent} />
            ) : (
              <Ionicons name="heart-outline" size={18} color={theme.accent} />
            )}
          </TouchableOpacity>
        </View>
        {item.location ? (
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={12} color={theme.muted} />
            <Text style={[styles.locText, { color: theme.muted }]} numberOfLines={1}>{item.location}</Text>
          </View>
        ) : null}
        {sharedNames.length > 0 ? (
          <View style={styles.chipsWrap}>
            {sharedNames.map((n) => (
              <View key={n} style={[styles.chip, { backgroundColor: theme.chipBg, borderColor: theme.chipBorder }]}>
                <Text style={[styles.chipText, { color: theme.chipText }]}>{n}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {item.bio ? (
          <Text style={[styles.bioText, { color: resolvedThemeMode === 'light' ? theme.sub : '#bfc6cc' }]} numberOfLines={2}>{item.bio}</Text>
        ) : null}
      </View>
    </View>
  );
}
