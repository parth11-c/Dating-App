import React from "react";
import { Tabs } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: true,
      headerStyle: { backgroundColor: "#0a0a0a" },
      headerTitleStyle: { color: "#fff" },
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
          tabBarIcon: ({ color, size }) => <FontAwesome name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => <FontAwesome name="search" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: "Post",
          tabBarIcon: ({ color, size }) => <FontAwesome name="plus-square" color={color} size={size} />,
        }}
      />
<Tabs.Screen
  name="message"
  options={{
    title: "Messages",
    tabBarIcon: ({ color, size }) => (
      <FontAwesome name="comments" color={color} size={size} />
    ),
  }}
/>
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <FontAwesome name="user" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
