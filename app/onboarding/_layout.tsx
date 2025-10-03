import React from "react";
import { Stack } from "expo-router";
import { OnboardingProvider } from "./_context";

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{
         headerShown: false,
        
        headerStyle: { backgroundColor: "#ffffff" },
        headerTitleStyle: { color: "#000" },
        headerTintColor: "#000",
        contentStyle: { backgroundColor: "#FFF5F8", paddingTop: 22 },
      }}>
        <Stack.Screen name="name" options={{ title: "Your name" }} />
        <Stack.Screen name="dob" options={{ title: "Your birthday" }} />
        <Stack.Screen name="gender" options={{ title: "Pronoun & Gender" }} />
        <Stack.Screen name="preference" options={{ title: "Who do you want to see?" }} />
        <Stack.Screen name="interests" options={{ title: "Your interests" }} />
        <Stack.Screen name="details" options={{ title: "Personal details" }} />
        <Stack.Screen name="photos" options={{ title: "Add 4 photos" }} />
      </Stack>
    </OnboardingProvider>
  );
}
