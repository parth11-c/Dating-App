import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, UIManager, Dimensions, ScrollView, Animated, Easing } from "react-native";
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


export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { resolvedThemeMode } = useStore();
  const [loading, setLoading] = React.useState(true);
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [myId, setMyId] = React.useState<string>('');
  const [myGender, setMyGender] = React.useState<Profile['gender']>(null);
  const [actionLoading, setActionLoading] = React.useState<null | 'pass' | 'like'>(null);
  const [transitionLoading, setTransitionLoading] = React.useState(false);
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

  // Slide animation state
  const translateCurrent = React.useRef(new Animated.Value(0)).current;
  const translateNext = React.useRef(new Animated.Value(screenWidth)).current;
  const scaleCurrent = React.useRef(new Animated.Value(1)).current;
  const scaleNext = React.useRef(new Animated.Value(1.03)).current;
  const opacityCurrent = React.useRef(new Animated.Value(1)).current;
  const opacityNext = React.useRef(new Animated.Value(0.9)).current;

  function runTransition(direction: 'left' | 'right', hasNext: boolean, onDone: () => void) {
    const ease = Easing.bezier(0.22, 1, 0.36, 1); // smooth ease-out
    if (hasNext) {
      translateNext.setValue(direction === 'left' ? screenWidth : -screenWidth);
      scaleNext.setValue(1.03);
      opacityNext.setValue(0.9);
      scaleCurrent.setValue(1);
      opacityCurrent.setValue(1);
      Animated.parallel([
        Animated.timing(translateCurrent, { toValue: direction === 'left' ? -screenWidth : screenWidth, duration: 450, easing: ease, useNativeDriver: true }),
        Animated.timing(translateNext, { toValue: 0, duration: 450, easing: ease, useNativeDriver: true }),
        Animated.timing(scaleCurrent, { toValue: 0.97, duration: 450, easing: ease, useNativeDriver: true }),
        Animated.timing(scaleNext, { toValue: 1, duration: 450, easing: ease, useNativeDriver: true }),
        Animated.timing(opacityCurrent, { toValue: 0.85, duration: 450, easing: ease, useNativeDriver: true }),
        Animated.timing(opacityNext, { toValue: 1, duration: 450, easing: ease, useNativeDriver: true }),
      ]).start(() => {
        translateCurrent.setValue(0);
        translateNext.setValue(screenWidth);
        scaleCurrent.setValue(1);
        scaleNext.setValue(1.03);
        opacityCurrent.setValue(1);
        opacityNext.setValue(0.9);
        onDone();
      });
    } else {
      Animated.parallel([
        Animated.timing(translateCurrent, { toValue: direction === 'left' ? -screenWidth : screenWidth, duration: 450, easing: ease, useNativeDriver: true }),
        Animated.timing(scaleCurrent, { toValue: 0.97, duration: 450, easing: ease, useNativeDriver: true }),
        Animated.timing(opacityCurrent, { toValue: 0.85, duration: 450, easing: ease, useNativeDriver: true }),
      ]).start(() => {
        translateCurrent.setValue(0);
        scaleCurrent.setValue(1);
        opacityCurrent.setValue(1);
        onDone();
      });
    }
  }

  const handleLike = async (likedId: string) => {
    try {
      if (!myId) {
        Alert.alert('Sign in required', 'Please sign in to like profiles.');
        return;
      }
      setActionLoading('like');
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
      // Advance with slide animation (like -> slide right, next from left)
      const hasNext = filtered.length > 1;
      setTransitionLoading(true);
      runTransition('right', hasNext, () => {
        setProfiles(prev => prev.filter(p => p.id !== likedId));
        setActionLoading(null);
        setTimeout(() => setTransitionLoading(false), 1000);
      });
      // Optional: Check mutual like to hint a match (actual match row may be created by backend)
      const { data: mutual } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', likedId)
        .eq('liked_id', myId)
        .maybeSingle();
      if (mutual) {
        setTransitionLoading(false);
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
      setActionLoading(null);
    }
  };

  const handlePass = async (passedId: string) => {
    // Animate removal and remove locally. If you have a `passes` table, insert there too.
    try {
      setActionLoading('pass');
      const hasNext = filtered.length > 1;
      setTransitionLoading(true);
      runTransition('left', hasNext, () => {
        setProfiles(prev => prev.filter(p => p.id !== passedId));
        setActionLoading(null);
        setTimeout(() => setTransitionLoading(false), 1000);
      });
    } catch {}
  };

  const filtered = React.useMemo(() => {
    return profiles.filter(p => {
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
  }, [profiles, myGender, ageMin, ageMax]);

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
      setProfiles(shuffleArray(filteredList as Profile[]));
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
          <View style={styles.cardsContainer}>
            {filtered[0] && (
              <Animated.View style={[styles.animatedCard, { transform: [{ translateX: translateCurrent }, { scale: scaleCurrent }], opacity: opacityCurrent }]}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingVertical: 8 }}
                >
                  <ProfileView
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
                  />
                </ScrollView>
              </Animated.View>
            )}
            {filtered[1] && (
              <Animated.View style={[styles.animatedCard, { transform: [{ translateX: translateNext }, { scale: scaleNext }], opacity: opacityNext }]}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingVertical: 8 }}
                >
                  <ProfileView
                    userId={filtered[1].id}
                    embedded
                    initialProfile={{
                      id: filtered[1].id,
                      name: filtered[1].name,
                      bio: filtered[1].bio ?? null,
                      gender: filtered[1].gender ?? null,
                      date_of_birth: filtered[1].date_of_birth ?? null,
                      location: filtered[1].location ?? null,
                      religion: null,
                    }}
                    initialPhotos={(filtered[1].photos || []).map((p, idx) => ({ id: idx, image_url: p.image_url }))}
                  />
                </ScrollView>
              </Animated.View>
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

          {/* Short loading overlay between profiles (1s) */}
          {transitionLoading && (
            <View style={styles.transitionOverlay}>
              <View style={styles.transitionCard}>
                <ActivityIndicator color={theme.accent} size="large" />
                <Text style={[styles.transitionText, { color: theme.text }]}>Loading…</Text>
              </View>
            </View>
          )}
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