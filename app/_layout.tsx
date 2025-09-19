import { Stack } from "expo-router";
import React from "react";
import { StoreProvider } from "@/store";

export default function RootLayout() {
  return (
    <StoreProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </StoreProvider>
  );
}
