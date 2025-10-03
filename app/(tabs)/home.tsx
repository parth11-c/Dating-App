import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Dimensions, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileView from './profile-view';
import { useStore } from '@/store';

const { width: screenWidth } = Dimensions.get('window');

type Profile = {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'non-binary' | 'other' | null;
  date_of_birth: string; // ISO date
  bio?: string | null;
  avatar_url?: string | null;
  location?: string | null;
  photos?: { id?: number; image_url: string; position?: number | null; created_at?: string | null }[];
  user_interests?: { interests?: { name?: string | null } | null }[];
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


export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { resolvedThemeMode } = useStore();
  const [loading, setLoading] = React.useState(true);
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [myId, setMyId] = React.useState<string>('');
  const [myGender, setMyGender] = React.useState<Profile['gender']>(null);
  const [actionLoading, setActionLoading] = React.useState<null | 'pass' | 'like'>(null);
  // Track profiles the user has dismissed (pass/like) in this session to avoid resurfacing
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());

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
  
  // Read-only preferences loaded from AsyncStorage; editing happens in Profile screen
  const [ageMin, setAgeMin] = React.useState<number>(18);
  const [ageMax, setAgeMax] = React.useState<number>(99);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [savedMin, savedMax] = await Promise.all([
          AsyncStorage.getItem('filters.ageMin'),
          AsyncStorage.getItem('filters.ageMax'),
        ]);
        if (mounted) {
          if (savedMin) setAgeMin(Math.max(18, Math.min(99, parseInt(savedMin) || 18)));
          if (savedMax) setAgeMax(Math.max(18, Math.min(99, parseInt(savedMax) || 99)));
        }

        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id || '';
        // Build exclusion list at DB layer: profiles previously liked/passed by me
        // Fetch liked profiles
        const { data: likedData } = await supabase.from('likes').select('liked_id').eq('liker_id', uid);
        const likedIds: string[] = Array.isArray(likedData) ? likedData.map((r: any) => r.liked_id).filter(Boolean) : [];
        
        // Skip passes for now since table doesn't exist
        const passedIds: string[] = [];
        const excludeSet = new Set<string>([...likedIds, ...passedIds, uid].filter(Boolean));
        const excludeList = Array.from(excludeSet);
        let profilesQuery = supabase
          .from('profiles')
          .select('id, name, gender, date_of_birth, bio, avatar_url, location, photos ( id, image_url, position, created_at ), user_interests ( interests ( name ) )')
          .order('position', { ascending: true, foreignTable: 'photos', nullsFirst: false })
          .order('created_at', { ascending: false, foreignTable: 'photos' })
          .order('created_at', { ascending: false });
        if (excludeList.length > 0) {
          const inClause = `(${excludeList.map((id) => `"${id}"`).join(',')})`;
          profilesQuery = profilesQuery.not('id', 'in', inClause);
        }
        const { data: list, error } = await profilesQuery;
        if (!mounted) return;
        setMyId(uid);
        // fetch my gender
        if (uid) {
          try {
            const { data: me } = await supabase
              .from('profiles')
              .select('gender')
              .eq('id', uid)
              .maybeSingle();
            if (mounted) setMyGender(me?.gender ?? null);
          } catch {}
        }
        const filtered = (list as any[] | null)?.filter(p => p.id !== uid) || [];
        // Ensure each profile's photos are ordered: position asc, then created_at desc
        const normalized = filtered.map((p: any) => ({
          ...p,
          photos: (p.photos || []).slice().sort((a: any, b: any) => {
            const ap = Number.isFinite(a?.position) ? Number(a.position) : undefined;
            const bp = Number.isFinite(b?.position) ? Number(b.position) : undefined;
            if (typeof ap === 'number' && typeof bp === 'number') {
              if (ap !== bp) return ap - bp;
            } else if (typeof ap === 'number') {
              return -1;
            } else if (typeof bp === 'number') {
              return 1;
            }
            const at = a?.created_at ? new Date(a.created_at).getTime() : 0;
            const bt = b?.created_at ? new Date(b.created_at).getTime() : 0;
            return bt - at;
          }),
        }));
        setProfiles(shuffleArray(normalized as Profile[]));
      } catch (e) {
        // Silently handle error - will show empty state
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Start over: refetch and shuffle all profiles
  const startOver = React.useCallback(async () => {
    try {
      setLoading(true);
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id || '';
      // Build exclusion list at DB layer
      // Fetch liked profiles
      const { data: likedData } = await supabase.from('likes').select('liked_id').eq('liker_id', uid);
      const likedIds: string[] = Array.isArray(likedData) ? likedData.map((r: any) => r.liked_id).filter(Boolean) : [];
      
      // Skip passes for now since table doesn't exist
      const passedIds: string[] = [];
      const excludeSet = new Set<string>([...likedIds, ...passedIds, uid].filter(Boolean));
      const excludeList = Array.from(excludeSet);
      let profilesQuery = supabase
        .from('profiles')
        .select('id, name, gender, date_of_birth, bio, avatar_url, location, photos ( id, image_url, position, created_at ), user_interests ( interests ( name ) )')
        .order('position', { ascending: true, foreignTable: 'photos', nullsFirst: false })
        .order('created_at', { ascending: false, foreignTable: 'photos' })
        .order('created_at', { ascending: false });
      if (excludeList.length > 0) {
        const inClause = `(${excludeList.map((id) => `"${id}"`).join(',')})`;
        profilesQuery = profilesQuery.not('id', 'in', inClause);
      }
      const { data: list } = await profilesQuery;
      setMyId(uid);
      // refresh my gender
      if (uid) {
        try {
          const { data: me } = await supabase
            .from('profiles')
            .select('gender')
            .eq('id', uid)
            .maybeSingle();
          setMyGender(me?.gender ?? null);
        } catch {}
      }
      const filteredList = (list as any[] | null)?.filter(p => p.id !== uid) || [];
      const normalized = filteredList.map((p: any) => ({
        ...p,
        photos: (p.photos || []).slice().sort((a: any, b: any) => {
          const ap = Number.isFinite(a?.position) ? Number(a.position) : undefined;
          const bp = Number.isFinite(b?.position) ? Number(b.position) : undefined;
          if (typeof ap === 'number' && typeof bp === 'number') {
            if (ap !== bp) return ap - bp;
          } else if (typeof ap === 'number') {
            return -1;
          } else if (typeof bp === 'number') {
            return 1;
          }
          const at = a?.created_at ? new Date(a.created_at).getTime() : 0;
          const bt = b?.created_at ? new Date(b.created_at).getTime() : 0;
          return bt - at;
        }),
      }));
      setProfiles(shuffleArray(normalized as Profile[]));
      // Reset dismissed set when starting over
      setDismissedIds(new Set());
    } catch (e) {
      // Silently handle error - will show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  // Realtime: if my profile changes (gender or dob) or if I like someone from elsewhere, refresh the list
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id || '';
      if (!uid) return;
      const channel = supabase
        .channel(`home-realtime-${uid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` }, () => {
          if (mounted) startOver();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes', filter: `liker_id=eq.${uid}` }, () => {
          if (mounted) startOver();
        })
        .subscribe();
      return () => { try { supabase.removeChannel(channel); } catch {} };
    })();
    return () => { mounted = false; };
  }, [startOver]);

  // Do not persist filters here; editing is moved to Profile

  const handleLike = async (likedId: string) => {
    try {
      if (!myId) {
        Alert.alert('Sign in required', 'Please sign in to like profiles.');
        return;
      }
      setActionLoading('like');
      // If already matched, do not allow sending a request again
      const a = myId < likedId ? myId : likedId;
      const b = myId < likedId ? likedId : myId;
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${a},user2_id.eq.${b}),and(user1_id.eq.${b},user2_id.eq.${a})`)
        .maybeSingle();
      if (existingMatch) {
        // Subtle notice then go to Matches
        try { Alert.alert('Already a match', 'You already matched with this profile.'); } catch {}
        setActionLoading(null);
        router.push('/(tabs)/matches' as any);
        return;
      }
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
      // Immediately remove from current list and mark as dismissed - no animation
      setProfiles(prev => prev.filter(p => p.id !== likedId));
      setDismissedIds(prev => new Set(prev).add(likedId));
      setActionLoading(null);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
      setActionLoading(null);
    }
  };

  const handlePass = async (passedId: string) => {
    try {
      setActionLoading('pass');
      // Immediately remove from current list and mark as dismissed - no animation
      setProfiles(prev => prev.filter(p => p.id !== passedId));
      setDismissedIds(prev => new Set(prev).add(passedId));
      setActionLoading(null);
    } catch {}
  };

  const filtered = React.useMemo(() => {
    return profiles.filter(p => {
      // Exclude locally dismissed profiles (pass/like) for this session
      if (dismissedIds.has(p.id)) return false;
      // gender filter: only show opposite gender of current user
      if (myGender === 'male') {
        if (p.gender !== 'female') return false;
      } else if (myGender === 'female') {
        if (p.gender !== 'male') return false;
      } // for non-binary/other/unknown, don't restrict by gender
      // age filter
      const a = ageFromDob(p.date_of_birth);
      if (typeof a === 'number') {
        if (a < ageMin || a > ageMax) return false;
      }
      return true;
    });
  }, [profiles, myGender, ageMin, ageMax, dismissedIds]);

  // Shuffle helper
  function shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

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
          <View style={styles.cardsContainer}>
            {filtered[0] && (
              <View style={styles.profileCard}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingVertical: 8 }}
                >
                  <ProfileView
                    key={filtered[0].id}
                    userId={filtered[0].id}
                    embedded
                    initialProfile={{
                      id: filtered[0].id,
                      name: filtered[0].name,
                      bio: filtered[0].bio ?? null,
                      gender: filtered[0].gender ?? null,
                      date_of_birth: filtered[0].date_of_birth ?? null,
                      location: filtered[0].location ?? null,
                      religion: null,
                    }}
                    initialPhotos={(filtered[0].photos || []).map((p, idx) => ({ id: idx, image_url: p.image_url }))}
                    initialInterests={(filtered[0].user_interests || []).map((r: any) => r?.interests?.name).filter((n: any) => typeof n === 'string')}
                  />
                </ScrollView>
              </View>
            )}
          </View>

          {/* Floating actions fixed at bottom */}
          <View pointerEvents="box-none" style={[styles.floatingActions, { bottom: insets.bottom + 16 }]}>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={() => { if (actionLoading) return; const cur = filtered[0]; if (cur) handlePass(cur.id); }}
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
                onPress={() => { if (actionLoading) return; const cur = filtered[0]; if (cur) handleLike(cur.id); }}
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
  fullScreenCard: { 
    width: screenWidth, 
    flex: 1,
  },
  cardsContainer: {
    width: screenWidth,
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  animatedCard: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: screenWidth,
  },
  profileCard: {
    flex: 1,
    width: screenWidth,
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
  transitionOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  transitionCard: { paddingHorizontal: 20, paddingVertical: 16, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center' },
  transitionText: { marginTop: 8, fontWeight: '700' },
});