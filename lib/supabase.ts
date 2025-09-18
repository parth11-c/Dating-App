import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use Expo public env vars
const SUPABASE_URL = "https://cigxfuvtlmeqxiocrdqx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZ3hmdXZ0bG1lcXhpb2NyZHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxODk2OTIsImV4cCI6MjA3Mzc2NTY5Mn0.PvGgOaFbhY1NJXoxfuOz-C7YMUMOsF88_TkPlR_BxSY";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase env vars are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

// Environment detection that works during Metro/Node bundling
const isWeb = typeof window !== 'undefined';
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

// Avoid using AsyncStorage or any storage during SSR / Node (when both flags are false)
// Only enable persistSession when running in a real runtime (web or RN)
export const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_ANON_KEY ?? '', {
  auth: {
    persistSession: isWeb || isReactNative,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    ...(isReactNative ? { storage: AsyncStorage as any } : {}),
  },
});
