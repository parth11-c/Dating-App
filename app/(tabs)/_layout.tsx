import React from "react";
import { View, Text } from "react-native";
import { Tabs, usePathname } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { useStore } from "@/store";
import { supabase } from "@/lib/supabase";

export default function TabsLayout() {
  const { currentUser } = useStore();
  const [hasUnread, setHasUnread] = React.useState(false);
  const pathname = usePathname();
  const onMessagesScreen = pathname?.endsWith('/message');

  React.useEffect(() => {
    if (!currentUser.id) return;
    const channel = supabase.channel(`tabs-unread-${currentUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const m = payload.new as { recipient_id?: string };
        if (m?.recipient_id === currentUser.id && !onMessagesScreen) {
          setHasUnread(true);
        }
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [currentUser.id, onMessagesScreen]);

  React.useEffect(() => {
    if (onMessagesScreen && hasUnread) setHasUnread(false);
  }, [onMessagesScreen, hasUnread]);

  return (
    <Tabs screenOptions={{
      headerShown: true,
      headerStyle: { backgroundColor: "#0a0a0a", borderBottomColor: '#222', borderBottomWidth: 1 },
      headerShadowVisible: false,
      headerTitleStyle: { color: "#fff", marginVertical: 0 },
      headerTitleAlign: 'center',
      headerTitleContainerStyle: { paddingVertical: 0 },
      headerLeftContainerStyle: { paddingVertical: 0 },
      headerRightContainerStyle: { paddingVertical: 0 },
      headerTitle: () => (
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>ClgMart</Text>
      ),
      headerTintColor: "#fff",
      tabBarActiveTintColor: "#fff",
      tabBarInactiveTintColor: "#888",
      tabBarStyle: { backgroundColor: "#0a0a0a", borderTopColor: "#222" },
      tabBarHideOnKeyboard: false,
    }}>
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <FontAwesome name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <FontAwesome name="search" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: "Post",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <FontAwesome name="plus-square" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="message"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <View style={{ width: size, height: size }}>
              <FontAwesome name="comments" color={color} size={size} />
              {hasUnread && (
                <View style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff3b30' }} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <FontAwesome name="user" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
