import { Stack } from "expo-router";
import React from "react";
import { StoreProvider } from "@/store";
import ErrorBoundary from "../components/ErrorBoundary";

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </StoreProvider>
    </ErrorBoundary>
  );
}
