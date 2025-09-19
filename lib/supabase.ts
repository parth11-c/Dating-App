import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// NOTE: For production, move these to EXPO_PUBLIC_* env vars.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://lqivxaxknhcviuumqeoe.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxaXZ4YXhrbmhjdml1dW1xZW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjI1NDksImV4cCI6MjA3MzgzODU0OX0.nRUdJYJywb6KHR2bFpp5OiE29nqfS_j0AcGszxQbioY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // Only provide AsyncStorage on native. On web, let supabase-js use localStorage automatically.
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage as any } : {}),
  },
});
