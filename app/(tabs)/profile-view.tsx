import React from "react";
import { View, Text, StyleSheet, Image, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "@/store";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  name: string;
  bio: string | null;
  gender: string | null;
  date_of_birth: string | null;
  location: string | null;
  religion: string | null;
};

type Photo = { id: number; image_url: string };

function interestIcon(name: string): keyof typeof Ionicons.glyphMap {
  const n = name.toLowerCase();
  if (/(music|rock|pop|hip|edm|indie|classical)/.test(n)) return 'musical-notes-outline';
  if (/(movie|series|bollywood|hollywood|anime|comics)/.test(n)) return 'film-outline';
  if (/(cricket|football|badminton|chess|sport)/.test(n)) return 'trophy-outline';
  if (/(fitness|yoga|run|cycle|hiking|hike)/.test(n)) return 'barbell-outline';
  if (/(photo|photography|camera)/.test(n)) return 'camera-outline';
  if (/(coffee|tea|baking|cook|vegan|bbq)/.test(n)) return 'restaurant-outline';
  if (/(read|writing|poetry|learn|self|startup|tech)/.test(n)) return 'book-outline';
  if (/(travel|trip|backpack|beach|mountain|camp)/.test(n)) return 'airplane-outline';
  if (/(volunteer|pet|board|nightlife)/.test(n)) return 'sparkles-outline' as any;
  return 'pricetag-outline';
}

type ProfileViewProps = {
  userId?: string;
  embedded?: boolean;
  actions?: React.ReactNode; // overlay actions rendered on hero
};

export default function ProfileViewScreen({ userId, embedded, actions }: ProfileViewProps) {
  const { currentUser } = useStore();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [photos, setPhotos] = React.useState<Photo[]>([]);
  const [interestNames, setInterestNames] = React.useState<string[]>([]);

  const load = React.useCallback(async () => {
    const targetId = userId || currentUser?.id;
    if (!targetId) return;
    const [{ data: p }, { data: ph }, { data: ui }] = await Promise.all([
      supabase.from('profiles').select('id, name, bio, gender, date_of_birth, location, religion').eq('id', targetId).maybeSingle(),
      supabase.from('photos').select('id, image_url').eq('user_id', targetId).order('created_at', { ascending: false }),
      supabase.from('user_interests').select('interest_id, interests(name)').eq('user_id', targetId)
    ]);
    setProfile((p as any) || null);
    setPhotos((ph as any[]) || []);
    const names = ((ui as any[]) || []).map((r: any) => r?.interests?.name).filter((n: any) => typeof n === 'string');
    setInterestNames(names);
  }, [currentUser?.id, userId]);

  React.useEffect(() => { load(); }, [load]);

  const age = React.useMemo(() => {
    const iso = profile?.date_of_birth; if (!iso) return undefined; const d = new Date(iso); if (isNaN(d.getTime())) return undefined;
    const t = new Date(); let a = t.getFullYear() - d.getFullYear(); const m = t.getMonth() - d.getMonth(); if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--; return a;
  }, [profile?.date_of_birth]);

  const chips = React.useMemo(() => {
    const out: Array<{ label: string; icon?: keyof typeof Ionicons.glyphMap }> = [];
    if (profile?.gender) out.push({ label: profile.gender, icon: 'person-outline' });
    if (profile?.location) out.push({ label: profile.location, icon: 'location-outline' });
    if (age !== undefined) out.push({ label: `${age} yrs`, icon: 'calendar-outline' });
    if (profile?.religion) out.push({ label: profile.religion, icon: 'book-outline' });
    return out;
  }, [profile?.gender, profile?.location, age]);

  const hero = photos[0]?.image_url;

  const Container: any = embedded ? View : ScrollView;
  const containerProps: any = embedded ? { style: styles.containerEmbedded } : { style: styles.container, contentContainerStyle: styles.content, showsVerticalScrollIndicator: false };

  return (
    <Container {...containerProps}>
      {/* Hero */}
      {hero ? (
        <View style={styles.heroWrap}>
          <Image source={{ uri: hero }} style={styles.heroImage} />
          <View style={styles.heroOverlay}>
            <View style={styles.badge}><Text style={styles.badgeText}>New here</Text></View>
            <Text style={styles.heroName}>{(profile?.name || currentUser.name || 'User')}{age !== undefined ? `, ${age}` : ''}</Text>
          </View>
          {actions ? <View style={styles.actionsOverlay}>{actions}</View> : null}
        </View>
      ) : (
        <View style={[styles.heroWrap, { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#222' }]}> 
          <Text style={{ color: '#888' }}>Add photos to showcase your profile</Text>
        </View>
      )}

      {/* About me */}
      <View style={styles.cardRounded}>
        <Text style={styles.cardTitle}>About me</Text>
        {chips.length === 0 ? (
          <Text style={styles.mutedSmall}>Add more details to your profile.</Text>
        ) : (
          <View style={styles.chipsWrap}>
            {chips.map((c, idx) => (
              <View key={`${c.label}-${idx}`} style={styles.chip}>
                {c.icon ? <Ionicons name={c.icon as any} size={14} color="#bbb" style={{ marginRight: 6 }} /> : null}
                <Text style={styles.chipText}>{c.label}</Text>
              </View>
            ))}
          </View>
        )}
        {profile?.bio ? <Text style={[styles.muted, { marginTop: 8 }]}>{profile.bio}</Text> : null}
      </View>

      {/* Remaining photos */}
      {photos.slice(1).map((p) => (
        <View key={p.id} style={styles.photoCard}>
          <Image source={{ uri: p.image_url }} style={styles.photoImage} />
        </View>
      ))}

      {/* Interests */}
      <View style={styles.cardRounded}>
        <Text style={styles.cardTitle}>Interests</Text>
        {interestNames.length === 0 ? (
          <Text style={styles.mutedSmall}>Add your interests from the Interests tab.</Text>
        ) : (
          <View style={styles.chipsWrap}>
            {interestNames.map((n) => (
              <View key={n} style={styles.chip}>
                <Ionicons name={interestIcon(n) as any} size={14} color="#bbb" style={{ marginRight: 6 }} />
                <Text style={styles.chipText}>{n}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  containerEmbedded: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 },
  heroWrap: {
    marginHorizontal: 0,
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: '#1f1f1f',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  heroImage: { width: '100%', aspectRatio: 3/4, borderRadius: 24 },
  heroOverlay: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  actionsOverlay: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', justifyContent: 'space-between' },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', marginBottom: 8 },
  badgeText: { color: '#fff', fontWeight: '700' },
  heroName: { color: '#fff', fontSize: 28, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 8 },
  cardRounded: {
    backgroundColor: '#111',
    borderColor: '#222',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 0,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 16, marginBottom: 6 },
  muted: { color: '#9aa0a6' },
  mutedSmall: { color: '#888', fontSize: 12 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  chip: { backgroundColor: '#1a1a1a', borderColor: '#2a2a2d', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, flexDirection: 'row', alignItems: 'center' },
  chipText: { color: '#ddd', fontWeight: '600' },
  photoCard: {
    marginHorizontal: 0,
    marginBottom: 16,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
    backgroundColor: '#0f0f0f',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  photoImage: { width: '100%', aspectRatio: 3/4 },
});
