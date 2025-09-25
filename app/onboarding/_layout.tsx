import React from "react";
import { Stack } from "expo-router";
import { OnboardingProvider } from "@/context/onboarding";

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{
        headerStyle: { backgroundColor: "#0a0a0a" },
        headerTitleStyle: { color: "#fff" },
        headerTintColor: "#fff",
        contentStyle: { backgroundColor: "#0a0a0a" },
      }}>
        <Stack.Screen name="name" options={{ title: "Your name" }} />
        <Stack.Screen name="dob" options={{ title: "Your birthday" }} />
        <Stack.Screen name="gender" options={{ title: "Pronoun & Gender" }} />
        <Stack.Screen name="preference" options={{ title: "Who you want to see" }} />
        <Stack.Screen name="details" options={{ title: "Personal details" }} />
        <Stack.Screen name="photos" options={{ title: "Add 6 photos" }} />
      </Stack>
    </OnboardingProvider>
  );
}
