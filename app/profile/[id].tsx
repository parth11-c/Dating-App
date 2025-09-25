import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "@/store";

type Profile = {
  id: string;
  name: string;
  bio: string | null;
  gender: 'male' | 'female' | 'non-binary' | 'other' | null;
  date_of_birth: string | null;
  location: string | null;
  avatar_url: string | null;
  photos?: { id: number; image_url: string }[];
};

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

export default function UserProfileViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { currentUser } = useStore();
  const [loading, setLoading] = React.useState(true);
  const [profile, setProfile] = React.useState<Profile | null>(null);

  if (!id) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No user specified.</Text>
      </View>
    );
  }

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, bio, gender, date_of_birth, location, avatar_url, photos ( id, image_url )')
        .eq('id', id)
        .single();
      if (!error && mounted) setProfile(data as any);
    })();
    return () => { mounted = false; };
  }, [id]);

  const handleLike = async () => {
    try {
      if (!currentUser?.id) {
        Alert.alert('Sign in required', 'Please sign in to like profiles.');
        return;
      }
      const { error } = await supabase.from('likes').insert({ liker_id: currentUser.id, liked_id: id });
      if (error) {
        Alert.alert('Could not like', error.message);
        return;
      }
      Alert.alert('Liked', 'We will let you know if it’s a match.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    }
  };

  const handleMessage = async () => {
    try {
      if (!currentUser?.id || !id) return;
      // Find existing match between current user and this profile
      const pair = [currentUser.id as string, id as string].sort();
      const { data: ms, error } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id')
        .or(`and(user1_id.eq.${pair[0]},user2_id.eq.${pair[1]}),and(user1_id.eq.${pair[1]},user2_id.eq.${pair[0]})`)
        .maybeSingle();
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      if (!ms) {
        Alert.alert('No match yet', 'You can message after you both like each other.');
        return;
      }
      router.push(`/chat/${ms.id}` as any);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Unable to open chat');
    }
  };

  if (loading && !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.header}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{profile?.name || 'User'}</Text>
            <Text style={styles.sub} numberOfLines={1}>
              {[profile?.location, (p => { const a = ageFromDob(p?.date_of_birth); return typeof a === 'number' ? `${a}` : undefined; })(profile)].filter(Boolean).join(' • ')}
            </Text>
          </View>
        </View>
        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.likeBtn} onPress={handleLike}>
            <Ionicons name="heart" size={16} color="#ff5b80" />
            <Text style={styles.likeBtnText}>Like</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBtn} onPress={handleMessage}>
            <Ionicons name="chatbubble-ellipses" size={16} color="#4da3ff" />
            <Text style={styles.editBtnText}>Message</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.divider} />

      {/* About */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>About</Text>
        {profile?.bio ? (
          <Text style={styles.bodyText}>{profile.bio}</Text>
        ) : (
          <Text style={styles.mutedSmall}>No bio added.</Text>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {profile?.gender ? (
            <View style={styles.pill}><Text style={styles.pillText}>{profile.gender}</Text></View>
          ) : null}
          {profile?.date_of_birth ? (
            <View style={styles.pill}><Text style={styles.pillText}>DOB: {profile.date_of_birth}</Text></View>
          ) : null}
          {profile?.location ? (
            <View style={styles.pill}><Text style={styles.pillText}>{profile.location}</Text></View>
          ) : null}
        </View>
      </View>

      {/* Photos */}
      <View style={styles.sectionRow}>
        <Text style={styles.section}>Photos</Text>
        <View style={styles.countBadge}><Text style={styles.countBadgeText}>{profile?.photos?.length || 0}</Text></View>
      </View>
      {(profile?.photos?.length || 0) === 0 ? (
        <Text style={styles.muted}>No photos.</Text>
      ) : (
        <FlatList
          key={'photos-3'}
          data={profile?.photos || []}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 60 }]}
          renderItem={({ item }) => (
            <View style={[styles.gridItem, { width: '32%' }]}>
              <Image source={{ uri: item.image_url }} style={{ width: '100%', aspectRatio: 1 }} />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0a0a0a" },
  headerCard: { 
    backgroundColor: '#0f0f0f', 
    borderColor: '#1e1e1e', 
    borderWidth: 1, 
    borderRadius: 14, 
    padding: 12, 
    marginBottom: 12,
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#444", marginRight: 12 },
  avatarImage: { width: 64, height: 64, borderRadius: 32, marginRight: 12 },
  name: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 2 },
  sub: { color: "#aaa" },
  section: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 8, marginBottom: 6 },
  muted: { color: "#9aa0a6" },
  card: { backgroundColor: "#111", borderColor: "#222", borderWidth: 1, borderRadius: 10, padding: 16, marginBottom: 8 },
  cardTitle: { color: "#fff", fontWeight: "600", marginBottom: 4 },
  bodyText: { color: '#ddd' },
  mutedSmall: { color: "#888", fontSize: 12 },
  actions: { gap: 10 },
  divider: { height: 1, backgroundColor: '#141414', borderBottomColor: '#1f1f1f', borderBottomWidth: 1, marginVertical: 8 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 6 },
  countBadge: { backgroundColor: '#121417', borderColor: '#1f2329', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  countBadgeText: { color: '#a6b1b8', fontSize: 12, fontWeight: '700' },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', backgroundColor: '#0f1b28', borderWidth: 1, borderColor: '#2a5b86', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  editBtnText: { color: '#4da3ff', fontWeight: '700' },
  likeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', backgroundColor: '#1a0f14', borderWidth: 1, borderColor: '#2a1a22', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  likeBtnText: { color: '#ff5b80', fontWeight: '800' },
  gridContent: { paddingTop: 8 },
  gridRow: { justifyContent: 'space-between', marginBottom: 8 },
  gridItem: {
    backgroundColor: '#111',
    borderColor: '#222',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    width: '49%',
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  gridImage: { width: '100%', aspectRatio: 1 },
  pill: { backgroundColor: '#121417', borderColor: '#1f2329', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { color: '#a6b1b8', fontSize: 12, fontWeight: '700' },
});
