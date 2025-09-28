import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert, ViewToken, LayoutAnimation, Platform, UIManager } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileView from './profile-view';
import { useStore } from '@/store';

type Profile = {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'non-binary' | 'other' | null;
  date_of_birth: string; // ISO date
  bio?: string | null;
  avatar_url?: string | null;
  location?: string | null;
  photos?: { image_url: string }[];
};

function ageFromDob(dobIso?: string) {
  if (!dobIso) return undefined;
  const dob = new Date(dobIso);
  if (isNaN(dob.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

function HomeProfileItem({ p, theme }: { p: Profile; theme: { card: string; } & { border: string } }) {
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}> 
      <TouchableOpacity onPress={() => router.push(`/profile/${p.id}` as any)} activeOpacity={0.9}>
        <ProfileView userId={p.id} embedded />
      </TouchableOpacity>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { resolvedThemeMode } = useStore();
  const [loading, setLoading] = React.useState(true);
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [myId, setMyId] = React.useState<string>('');
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [actionLoading, setActionLoading] = React.useState<null | 'pass' | 'like'>(null);
  // Enable LayoutAnimation on Android
  React.useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const theme = useMemo(() => {
    if (resolvedThemeMode === 'light') {
      return {
        bg: '#FFF5F8',
        card: '#ffffff',
        border: '#f0cfd8',
        text: '#1a1a1a',
        sub: '#6b5b61',
        avatarBg: '#f3dbe3',
        accent: '#ff5b80',
        accentSubtle: '#ffe9f0',
        passBtnBg: '#ffe9f0',
        passBtnBorder: '#f4cdd8',
        passIcon: '#1a1a1a',
        likeBtnBg: '#ffe9f0',
        likeBtnBorder: '#f4cdd8',
      } as const;
    }
    return {
      bg: '#0a0a0a',
      card: '#111',
      border: '#222',
      text: '#fff',
      sub: '#888',
      avatarBg: '#222',
      accent: '#ff5b80',
      accentSubtle: '#1a0f14',
      passBtnBg: '#1f1f1f',
      passBtnBorder: '#333',
      passIcon: '#fff',
      likeBtnBg: '#1a0f14',
      likeBtnBorder: '#2a1a22',
    } as const;
  }, [resolvedThemeMode]);
  const viewabilityConfig = React.useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = React.useRef(({ viewableItems }: { viewableItems: Array<ViewToken>; changed: Array<ViewToken> }) => {
    if (viewableItems && viewableItems.length > 0) {
      const first = viewableItems[0];
      const idx = first.index != null ? first.index : 0;
      setCurrentIndex(idx);
    }
  }).current;
  // Read-only preferences loaded from AsyncStorage; editing happens in Profile screen
  const [genderFilter, setGenderFilter] = React.useState<'all' | 'male' | 'female' | 'non-binary' | 'other'>('all');
  const [ageMin, setAgeMin] = React.useState<number>(18);
  const [ageMax, setAgeMax] = React.useState<number>(99);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [savedGender, savedMin, savedMax] = await Promise.all([
          AsyncStorage.getItem('filters.gender'),
          AsyncStorage.getItem('filters.ageMin'),
          AsyncStorage.getItem('filters.ageMax'),
        ]);
        if (mounted) {
          if (savedGender && ['all','male','female','non-binary','other'].includes(savedGender)) setGenderFilter(savedGender as any);
          if (savedMin) setAgeMin(Math.max(18, Math.min(99, parseInt(savedMin) || 18)));
          if (savedMax) setAgeMax(Math.max(18, Math.min(99, parseInt(savedMax) || 99)));
        }

        const [{ data: sess }, { data: list, error }] = await Promise.all([
          supabase.auth.getSession(),
          supabase
            .from('profiles')
            .select('id, name, gender, date_of_birth, bio, avatar_url, location, photos ( image_url )')
            .order('created_at', { ascending: false })
        ]);
        if (!mounted) return;
        const uid = sess.session?.user?.id || '';
        setMyId(uid);
        const filtered = (list as any[] | null)?.filter(p => p.id !== uid) || [];
        setProfiles(shuffleArray(filtered as Profile[]));
      } catch (e) {
        console.error('[Home] load profiles error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Do not persist filters here; editing is moved to Profile

  const handleLike = async (likedId: string) => {
    try {
      if (!myId) {
        Alert.alert('Sign in required', 'Please sign in to like profiles.');
        return;
      }
      setActionLoading('like');
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      // If already liked, go to Matches directly
      const { data: existing } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', myId)
        .eq('liked_id', likedId)
        .maybeSingle();
      if (existing) {
        setActionLoading(null);
        router.push('/(tabs)/matches' as any);
        return;
      }
      const { error } = await supabase.from('likes').insert({ liker_id: myId, liked_id: likedId });
      if (error) {
        Alert.alert('Could not like', error.message);
        return;
      }
      setProfiles(prev => prev.filter(p => p.id !== likedId));
      // Optional: Check mutual like to hint a match (actual match row may be created by backend)
      const { data: mutual } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', likedId)
        .eq('liked_id', myId)
        .maybeSingle();
      if (mutual) {
        // Ensure a match row exists (order-invariant pair)
        try {
          const a = myId < likedId ? myId : likedId;
          const b = myId < likedId ? likedId : myId;
          const { data: existingMatch } = await supabase
            .from('matches')
            .select('id')
            .or(`and(user1_id.eq.${a},user2_id.eq.${b}),and(user1_id.eq.${b},user2_id.eq.${a})`)
            .maybeSingle();
          if (!existingMatch) {
            await supabase.from('matches').insert({ user1_id: a, user2_id: b });
          }
        } catch {}
        // Navigate to Matches page
        router.push('/(tabs)/matches' as any);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    } finally { setActionLoading(null); }
  };

  const handlePass = async (passedId: string) => {
    // Animate removal and remove locally. If you have a `passes` table, insert there too.
    try {
      setActionLoading('pass');
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setProfiles(prev => prev.filter(p => p.id !== passedId));
    } finally {
      setTimeout(() => setActionLoading(null), 250);
    }
  };

  const filtered = React.useMemo(() => {
    return profiles.filter(p => {
      // gender filter
      // If a preferred gender is set, require an exact match and exclude unknown/null genders
      if (genderFilter !== 'all') {
        if (p.gender !== genderFilter) return false;
      }
      // age filter
      const a = ageFromDob(p.date_of_birth);
      if (typeof a === 'number') {
        if (a < ageMin || a > ageMax) return false;
      }
      return true;
    });
  }, [profiles, genderFilter, ageMin, ageMax]);

  // Shuffle helper
  function shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Start over: refetch and shuffle all profiles
  const startOver = React.useCallback(async () => {
    try {
      setLoading(true);
      const [{ data: sess }, { data: list }] = await Promise.all([
        supabase.auth.getSession(),
        supabase
          .from('profiles')
          .select('id, name, gender, date_of_birth, bio, avatar_url, location, photos ( image_url )')
          .order('created_at', { ascending: false })
      ]);
      const uid = sess.session?.user?.id || '';
      setMyId(uid);
      const filteredList = (list as any[] | null)?.filter(p => p.id !== uid) || [];
      setProfiles(shuffleArray(filteredList as Profile[]));
      setCurrentIndex(0);
    } catch (e) {
      console.error('[Home] start over error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['left','right','bottom']}>
      {/* Filters moved to Profile edit; Home remains clean */}

      {loading ? (
        <View style={styles.emptyWrap}>
          <ActivityIndicator color={resolvedThemeMode === 'light' ? theme.accent : '#fff'} />
          <Text style={[styles.text, { color: theme.sub, marginTop: 8 }]}>Loading profiles…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.text, { color: theme.sub }]}>No profiles to show right now.</Text>
          <TouchableOpacity style={[styles.startOverBtn, { backgroundColor: resolvedThemeMode === 'light' ? '#ffffff' : '#1f1f1f', borderColor: theme.border }]} onPress={startOver}>
            <Text style={[styles.startOverText, { color: resolvedThemeMode === 'light' ? '#1a1a1a' : '#fff' }]}>Start Over</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 140 }]}
            renderItem={({ item }) => (<HomeProfileItem p={item} theme={theme} />)}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
          />

          {/* Floating actions fixed at bottom */}
          <View pointerEvents="box-none" style={[styles.floatingActions, { bottom: insets.bottom + 16 }]}>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={() => { if (actionLoading) return; const cur = filtered[currentIndex]; if (cur) handlePass(cur.id); }}
                style={[
                  styles.fab,
                  { backgroundColor: theme.passBtnBg, borderColor: theme.passBtnBorder },
                  actionLoading ? styles.fabDisabled : null,
                ]}
                disabled={!!actionLoading}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Pass"
              >
                {actionLoading === 'pass' ? (
                  <ActivityIndicator color={theme.passIcon} />
                ) : (
                  <Ionicons name="close" size={24} color={theme.passIcon} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { if (actionLoading) return; const cur = filtered[currentIndex]; if (cur) handleLike(cur.id); }}
                style={[
                  styles.fab,
                  { backgroundColor: theme.likeBtnBg, borderColor: theme.likeBtnBorder },
                  actionLoading ? styles.fabDisabled : null,
                ]}
                disabled={!!actionLoading}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Like"
              >
                {actionLoading === 'like' ? (
                  <ActivityIndicator color={theme.accent} />
                ) : (
                  <Ionicons name="heart" size={24} color={theme.accent} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  text: { color: "#fff", textAlign: "center" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  list: { padding: 12 },
  card: { 
    backgroundColor: "#111", 
    borderRadius: 12, 
    overflow: "hidden", 
    marginBottom: 12, 
    borderColor: "#222", 
    borderWidth: 1,
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  // The following styles were used by the old card body; we now rely on ProfileView's own layout.
  imageWrap: { position: 'relative' },
  image: { width: "100%", height: 180, backgroundColor: "#222" },
  imageOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, backgroundColor: 'rgba(0,0,0,0.08)' },
  overlayActions: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 4 },
  cardBody: { padding: 12 },
  title: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 2 },
  meta: { color: "#aaa", fontSize: 12, marginBottom: 10 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sellerAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
  sellerAvatarPlaceholder: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
  sellerName: { color: '#ddd', fontSize: 12, fontWeight: '600' },
  likeBtn: { backgroundColor: '#1a0f14', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#2a1a22' },
  fab: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2, borderWidth: 1, borderColor: '#ddd' },
  fabLeft: {},
  fabRight: {},
  fabDisabled: { opacity: 0.7 },
  floatingActions: { position: 'absolute', left: 16, right: 16 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  startOverBtn: { marginTop: 12, backgroundColor: '#1f1f1f', borderColor: '#333', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  startOverText: { color: '#fff', fontWeight: '800' },
});