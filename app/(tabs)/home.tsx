import React from "react";
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileView from './profile-view';

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

function HomeProfileItem({ p, onLike, onPass }: { p: Profile; onLike: (id: string) => void; onPass: (id: string) => void }) {
  return (
    <View style={styles.card}> 
      <TouchableOpacity onPress={() => router.push(`/profile/${p.id}` as any)} activeOpacity={0.9}>
        <ProfileView
          userId={p.id}
          embedded
          actions={(
            <View style={styles.overlayActions} pointerEvents="box-none">
              <TouchableOpacity
                onPress={() => onPass(p.id)}
                style={[styles.fab, styles.fabLeft]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Pass"
              >
                <Ionicons name="close" size={22} color="#111" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onLike(p.id)}
                style={[styles.fab, styles.fabRight]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Like"
              >
                <Ionicons name="heart" size={20} color="#ff5b80" />
              </TouchableOpacity>
            </View>
          )}
        />
      </TouchableOpacity>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = React.useState(true);
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [myId, setMyId] = React.useState<string>('');
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
        setProfiles(filtered as Profile[]);
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
        // Try creating a match (best-effort)
        try {
          await supabase.from('matches').insert({ user_a: myId, user_b: likedId });
        } catch {}
        Alert.alert("It's a match!", 'You both liked each other. Say hi in messages.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    }
  };

  const handlePass = async (passedId: string) => {
    // For now, just remove locally. If you have a `passes` table, you can insert there.
    setProfiles(prev => prev.filter(p => p.id !== passedId));
  };

  const filtered = React.useMemo(() => {
    return profiles.filter(p => {
      // gender filter
      if (genderFilter !== 'all' && p.gender && p.gender !== genderFilter) return false;
      // age filter
      const a = ageFromDob(p.date_of_birth);
      if (typeof a === 'number') {
        if (a < ageMin || a > ageMax) return false;
      }
      return true;
    });
  }, [profiles, genderFilter, ageMin, ageMax]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Filters moved to Profile edit; Home remains clean */}

      {loading ? (
        <View style={styles.emptyWrap}>
          <ActivityIndicator color="#fff" />
          <Text style={[styles.text, { marginTop: 8 }]}>Loading profiles…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.text}>No profiles to show right now. Check back later!</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          renderItem={({ item }) => (<HomeProfileItem p={item} onLike={handleLike} onPass={handlePass} />)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
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
  overlayActions: { flexDirection: 'row', justifyContent: 'space-between' },
  cardBody: { padding: 12 },
  title: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 2 },
  meta: { color: "#aaa", fontSize: 12, marginBottom: 10 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sellerAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
  sellerAvatarPlaceholder: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
  sellerName: { color: '#ddd', fontSize: 12, fontWeight: '600' },
  likeBtn: { backgroundColor: '#1a0f14', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#2a1a22' },
  fab: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2, borderWidth: 1, borderColor: '#ddd' },
  fabLeft: { alignSelf: 'flex-start' },
  fabRight: { alignSelf: 'flex-end', backgroundColor: '#1a0f14', borderColor: '#2a1a22' },
});
