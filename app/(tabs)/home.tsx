import React from "react";
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

function ProfileCard({ p, onLike }: { p: Profile; onLike: (id: string) => void }) {
  const cover = p.photos?.[0]?.image_url || p.avatar_url || undefined;
  const age = ageFromDob(p.date_of_birth);
  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => router.push(`/profile/${p.id}` as any)}>
        <View style={styles.imageWrap}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.image} />
          ) : (
            <View style={[styles.image, { alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="person" size={48} color="#444" />
            </View>
          )}
          <View style={styles.imageOverlay} />
        </View>
      </TouchableOpacity>
      <View style={styles.cardBody}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.title} numberOfLines={1}>{p.name}{typeof age === 'number' ? `, ${age}` : ''}</Text>
        </View>
        {p.bio ? <Text style={styles.meta} numberOfLines={2}>{p.bio}</Text> : null}
        <View style={styles.sellerRow}>
          {p.avatar_url ? (
            <Image source={{ uri: p.avatar_url }} style={styles.sellerAvatar} />
          ) : (
            <View style={styles.sellerAvatarPlaceholder} />
          )}
          <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push(`/profile/${p.id}` as any)}>
            <Text style={styles.sellerName} numberOfLines={1}>{p.location || 'View profile'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.likeBtn} onPress={() => onLike(p.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="heart" size={16} color="#ff5b80" />
          </TouchableOpacity>
        </View>
      </View>
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
        Alert.alert("It's a match!", 'You both liked each other. Say hi in messages.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    }
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
          renderItem={({ item }) => (<ProfileCard p={item} onLike={handleLike} />)}
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
  imageWrap: { position: 'relative' },
  image: { width: "100%", height: 180, backgroundColor: "#222" },
  imageOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, backgroundColor: 'rgba(0,0,0,0.08)' },
  cardBody: { padding: 12 },
  title: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 2 },
  meta: { color: "#aaa", fontSize: 12, marginBottom: 10 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sellerAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
  sellerAvatarPlaceholder: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
  sellerName: { color: '#ddd', fontSize: 12, fontWeight: '600' },
  likeBtn: { backgroundColor: '#1a0f14', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#2a1a22' },
});
