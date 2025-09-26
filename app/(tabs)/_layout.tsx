import React from "react";
import { View, Text, Alert, StyleSheet } from "react-native";
import { Tabs, usePathname, router } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { useStore } from "@/store";
import { supabase } from "@/lib/supabase";

export default function TabsLayout() {
  const { currentUser } = useStore();
  const [hasUnread, setHasUnread] = React.useState(false);
  const [profileComplete, setProfileComplete] = React.useState(true);
  const pathname = usePathname();
  const onMessagesScreen = pathname?.endsWith('/message') || pathname?.includes('/chat/');

  React.useEffect(() => {
    if (!currentUser.id) return;
    const channel = supabase.channel(`tabs-unread-${currentUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const m = payload.new as { sender_id?: string };
        if (m?.sender_id && m.sender_id !== currentUser.id && !onMessagesScreen) {
          setHasUnread(true);
        }
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [currentUser.id, onMessagesScreen]);

  React.useEffect(() => {
    if (onMessagesScreen && hasUnread) setHasUnread(false);
  }, [onMessagesScreen, hasUnread]);

  // Global guard: force profile completion
  const checkProfileComplete = React.useCallback(async () => {
    try {
      if (!currentUser?.id) return; // not logged in yet
      const [{ data: p }, { data: ph }] = await Promise.all([
        supabase.from('profiles').select('id, name, gender, pronoun, preferred_gender, date_of_birth').eq('id', currentUser.id).maybeSingle(),
        supabase.from('photos').select('id').eq('user_id', currentUser.id)
      ]);
      const profile = p as any;
      const photos = (ph as any[]) || [];
      const complete = !!(profile && profile.name && profile.gender && profile.pronoun && profile.date_of_birth && profile.preferred_gender && photos.length === 4);
      setProfileComplete(complete);
      if (!complete && !pathname?.startsWith('/onboarding')) {
        // block and redirect to the next missing step
        const nextPath = !profile?.name
          ? '/onboarding/name'
          : !(profile?.gender && profile?.pronoun)
          ? '/onboarding/gender'
          : !profile?.date_of_birth
          ? '/onboarding/dob'
          : !profile?.preferred_gender
          ? '/onboarding/preference'
          : photos.length !== 4
          ? '/onboarding/photos'
          : '/onboarding/name';
        Alert.alert('Complete your profile', 'Please complete onboarding first: Name → Pronoun & Gender → DOB → Preference → Details → 4 Photos.', [
          { text: 'OK', onPress: () => router.replace(nextPath as any) }
        ]);
        router.replace(nextPath as any);
      }
    } catch {
      // ignore
    }
  }, [currentUser?.id, pathname]);

  React.useEffect(() => {
    checkProfileComplete();
  }, [checkProfileComplete]);

  return (
    <Tabs
      screenOptions={{
      headerShown: true,
      headerStyle: { backgroundColor: "#0a0a0a", borderBottomColor: '#222', borderBottomWidth: 1 },
      headerShadowVisible: false,
      headerTitleStyle: { color: "#fff", marginVertical: 0 },
      headerTitleAlign: 'center',
      headerTitleContainerStyle: { paddingVertical: 0 },
      headerLeftContainerStyle: { paddingVertical: 0 },
      headerRightContainerStyle: { paddingVertical: 0 },
      headerTitle: () => (
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>MatchUp</Text>
      ),
      headerTintColor: "#fff",
      tabBarActiveTintColor: "#fff",
      tabBarInactiveTintColor: "#888",
      tabBarStyle: { backgroundColor: "transparent", borderTopColor: "transparent", borderTopWidth: 0 },
      tabBarHideOnKeyboard: false,
      tabBarBackground: () => (
        <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: '#333' }} />
        </View>
      ),
    }}>
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <FontAwesome name="home" color={color} size={size} />,
          // prevent tab access when incomplete
        }}
        listeners={{
          tabPress: (e) => {
            if (!profileComplete) {
              e.preventDefault();
              Alert.alert('Complete your profile', 'Please complete onboarding first.');
              router.replace('/onboarding/dob' as any);
            }
          },
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Matches",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <FontAwesome name="heart" color={color} size={size} />,
        }}
        listeners={{
          tabPress: (e) => {
            if (!profileComplete) {
              e.preventDefault();
              Alert.alert('Complete your profile', 'Please complete your profile first.');
              router.replace('/(tabs)/profile?edit=1' as any);
            }
          },
        }}
      />
      <Tabs.Screen
        name="interests"
        options={{
          title: "For You",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <FontAwesome name="star" color={color} size={size} />,
        }}
        listeners={{
          tabPress: (e) => {
            if (!profileComplete) {
              e.preventDefault();
              Alert.alert('Complete your profile', 'Please complete your profile first.');
              router.replace('/(tabs)/profile?edit=1' as any);
            }
          },
        }}
      />
      
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <FontAwesome name="comments" color={color} size={size} />,
          tabBarBadge: hasUnread ? '•' : undefined,
          tabBarBadgeStyle: { backgroundColor: '#ff4d4f', color: '#fff', minWidth: 16, height: 16, borderRadius: 8, fontSize: 12, lineHeight: 14, textAlign: 'center', paddingHorizontal: 0 },
        }}
        listeners={{
          tabPress: (e) => {
            if (!profileComplete) {
              e.preventDefault();
              Alert.alert('Complete your profile', 'Please complete your profile first.');
              router.replace('/(tabs)/profile?edit=1' as any);
            }
          },
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerTitle: () => <View />, 
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <FontAwesome name="user" color={color} size={size} />,
          headerRight: () => (
            <Text onPress={() => router.push('/(tabs)/settings' as any)} style={{ color: '#fff', paddingHorizontal: 12 }}>
              <FontAwesome name="cog" color="#fff" size={20} />
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          // Hide from tab bar but keep as a routable screen
          href: null as any,
          title: 'Settings',
        }}
      />
      <Tabs.Screen
        name="profile-view"
        options={{
          href: null as any,
          title: 'Profile',
          headerLeft: () => (
            <Text onPress={() => router.replace('/(tabs)/profile' as any)} style={{ color: '#fff', paddingHorizontal: 12 }}>
              <FontAwesome name="chevron-left" color="#fff" size={18} />
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile-edit"
        options={{
          href: null as any,
          title: 'Edit profile',
          headerLeft: () => (
            <Text onPress={() => router.replace('/(tabs)/profile' as any)} style={{ color: '#fff', paddingHorizontal: 12 }}>
              <FontAwesome name="chevron-left" color="#fff" size={18} />
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}
