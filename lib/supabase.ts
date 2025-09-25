import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// NOTE: For production, move these to EXPO_PUBLIC_* env vars.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://sgjrlsezhrwacladnfad.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnanJsc2V6aHJ3YWNsYWRuZmFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MDM5ODAsImV4cCI6MjA3NDI3OTk4MH0.3N8tQlmDBuyQPz5E5ud_5WYYwBT-5jlpBmZIPYreozM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // Only provide AsyncStorage on native. On web, let supabase-js use localStorage automatically.
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage as any } : {}),
  },
});
