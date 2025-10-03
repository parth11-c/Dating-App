import React, { useMemo } from "react";
import { View, Text, Alert, StyleSheet, TouchableOpacity, Appearance } from "react-native";
import { Tabs, usePathname, router } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { useStore } from "@/store";
import { supabase } from "@/lib/supabase";
import * as Haptics from 'expo-haptics';

export default function TabsLayout() {
  const { currentUser, themeMode, resolvedThemeMode, toggleTheme, setTheme } = useStore();
  const [hasUnread, setHasUnread] = React.useState(false);
  const [profileComplete, setProfileComplete] = React.useState(true);
  const pathname = usePathname();
  const onMessagesScreen = pathname?.endsWith('/message') || pathname?.includes('/chat/');

  const theme = useMemo(() => {
    if (resolvedThemeMode === 'light') {
      return {
        bg: '#FFF5F8',
        text: '#1a1a1a',
        subtext: '#6b5b61',
        border: '#f0cfd8',
        accent: '#ff5b80',
        badgeBg: '#ff4d6d',
        headerShadow: false,
        tabInactive: '#9b7f89',
      } as const;
    }
    return {
      bg: '#0a0a0a',
      text: '#fff',
      subtext: '#888',
      border: '#222',
      accent: '#ff5b80',
      badgeBg: '#ff4d4f',
      headerShadow: false,
      tabInactive: '#888',
    } as const;
  }, [resolvedThemeMode]);

  const HeaderToggle = () => (
    <TouchableOpacity
      accessibilityLabel="Toggle theme"
      onPress={async () => { try { await Haptics.selectionAsync(); } catch {} toggleTheme(); }}
      onLongPress={async () => { try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} setTheme('system'); try { const sys = Appearance.getColorScheme(); Alert.alert('Theme', `Using system (${sys || 'dark'})`); } catch {} }}
      style={{
        marginRight: 8,
        paddingHorizontal: 10,
        height: 30,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: resolvedThemeMode === 'light' ? '#ffe9f0' : '#1f1f1f',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: resolvedThemeMode === 'light' ? '#f4cdd8' : '#333',
      }}
    >
      <FontAwesome name={resolvedThemeMode === 'light' ? 'moon-o' : 'sun-o'} size={16} color={theme.accent} />
    </TouchableOpacity>
  );

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
        supabase.from('profiles').select('id, name, gender, pronoun, date_of_birth').eq('id', currentUser.id).maybeSingle(),
        supabase.from('photos').select('id').eq('user_id', currentUser.id)
      ]);
      const profile = p as any;
      const photos = (ph as any[]) || [];
      const complete = !!(profile && profile.name && profile.gender && profile.pronoun && profile.date_of_birth && photos.length === 4);
      setProfileComplete(complete);
      if (!complete && !pathname?.startsWith('/onboarding')) {
        // block and redirect to the next missing step
        const nextPath = !profile?.name
          ? '/onboarding/name'
          : !(profile?.gender && profile?.pronoun)
          ? '/onboarding/gender'
          : !profile?.date_of_birth
          ? '/onboarding/dob'
          : photos.length !== 4
          ? '/onboarding/photos'
          : '/onboarding/name';
        Alert.alert('Complete your profile', 'Please complete onboarding first: Name → Pronoun & Gender → DOB → Details → 4 Photos.', [
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
      headerStyle: { backgroundColor: theme.bg },
      headerBackground: () => (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: theme.border }} />
        </View>
      ),
      headerShadowVisible: theme.headerShadow,
      headerTitleStyle: { color: theme.text, marginVertical: 0 },
      headerTitleAlign: 'center',
      headerTitleContainerStyle: { paddingVertical: 0 },
      headerLeftContainerStyle: { paddingVertical: 0 },
      headerRightContainerStyle: { paddingVertical: 0 },
      headerTitle: () => (
        <Text style={{ color: theme.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>MatchUp</Text>
      ),
      headerTintColor: theme.text,
      tabBarActiveTintColor: resolvedThemeMode === 'light' ? theme.accent : '#fff',
      tabBarInactiveTintColor: theme.tabInactive,
      tabBarHideOnKeyboard: false,
      tabBarStyle: {
        backgroundColor: theme.bg,
        borderTopColor: resolvedThemeMode === 'light' ? theme.border : '#222222',
        borderTopWidth: resolvedThemeMode === 'light' ? StyleSheet.hairlineWidth : 1,
      },
    }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <FontAwesome name="home" color={color} size={size} />,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <HeaderToggle />
            </View>
          ),
        }}
        listeners={{
          tabPress: (e: any) => {
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
          tabPress: (e: any) => {
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
          headerTitle: () => (
            <Text style={{ color: theme.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>MatchUp</Text>
          ), 
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <FontAwesome name="user" color={color} size={size} />,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <HeaderToggle />
              <Text onPress={() => router.push('/(tabs)/settings' as any)} style={{ color: theme.text, paddingHorizontal: 12 }}>
                <FontAwesome name="cog" color={theme.text} size={20} />
              </Text>
            </View>
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
            <Text onPress={() => router.replace('/(tabs)/profile' as any)} style={{ color: theme.text, paddingHorizontal: 12 }}>
              <FontAwesome name="chevron-left" color={theme.text} size={18} />
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
            <Text onPress={() => router.replace('/(tabs)/profile' as any)} style={{ color: theme.text, paddingHorizontal: 12 }}>
              <FontAwesome name="chevron-left" color={theme.text} size={18} />
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}
