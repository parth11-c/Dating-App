import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { StoreState, User } from './types';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

// Storage bucket for post images (configurable via env)
const POSTS_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_POSTS_BUCKET || 'post-images';
const AVATARS_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_AVATARS_BUCKET || 'avatars';

type StoreContextType = StoreState & {
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (input: { name?: string; avatarUri?: string | null }) => Promise<{ ok: true } | { ok: false; reason: string }>;
};

const StoreContext = createContext<StoreContextType | null>(null);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<StoreState>({ currentUser: { id: '', name: '' } });

  // Helpers
  const loadSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const uid = session.user.id;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
      // If profile row doesn't exist, create a minimal one so updates persist
      if (!profile) {
        const initialName = (session.user.user_metadata as any)?.name || session.user.email || 'User';
        await supabase.from('profiles').upsert({ id: uid, name: initialName }, { onConflict: 'id' });
      }
      const user: User = { id: uid, name: (profile?.name) || (session.user.user_metadata as any)?.name || session.user.email || 'User', avatar: profile?.avatar_url };
      setState((prev) => ({ ...prev, currentUser: user }));
    } else {
      setState((prev) => ({ ...prev, currentUser: { id: '', name: '' } }));
    }
  }, []);

  useEffect(() => {
    loadSession();
    // No products subscription in dating app
    return () => {};
  }, [loadSession]);

  // Listen for auth state changes globally to handle invalid refresh tokens or sign-outs
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        // Session is gone (e.g., invalid/expired refresh token). Clear local user and route to sign-in.
        setState((prev) => ({ ...prev, currentUser: { id: '', name: '' } }));
        try {
          router.replace('/auth/sign-in' as any);
        } catch {}
      } else {
        // Refresh local user info when session changes
        loadSession();
      }
    });
    return () => {
      authListener?.subscription?.unsubscribe?.();
    };
  }, [loadSession]);

  const signIn: StoreContextType['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, reason: error.message };
    // Ensure email is verified before allowing sign-in
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      await supabase.auth.signOut();
      return { ok: false, reason: userErr.message };
    }
    const user = userRes.user;
    const emailVerified = !!(user as any)?.email_confirmed_at;
    if (!emailVerified) {
      await supabase.auth.signOut();
      return { ok: false, reason: 'Please verify your email before signing in. Check your inbox for the confirmation link.' };
    }
    await loadSession();
    return { ok: true };
  };

  const updateProfile: StoreContextType['updateProfile'] = async (input) => {
    try {
      if (!state.currentUser.id) return { ok: false, reason: 'Not signed in' };
      const uid = state.currentUser.id;
      let avatar_url: string | null | undefined = undefined;
      if (typeof input.avatarUri !== 'undefined') {
        if (input.avatarUri === null) avatar_url = null; // clear
        else avatar_url = await uploadAvatarIfNeeded(uid, input.avatarUri);
      }
      const payload: any = {};
      if (typeof input.name === 'string') payload.name = input.name;
      if (typeof avatar_url !== 'undefined') payload.avatar_url = avatar_url;
      if (Object.keys(payload).length === 0) return { ok: true };
      // Use upsert so that if the profile row doesn't exist yet, it will be created
      const { error } = await supabase.from('profiles').upsert({ id: uid, ...payload }, { onConflict: 'id' });
      if (error) return { ok: false, reason: error.message };
      // Refresh current user in state
      setState((prev) => ({
        ...prev,
        currentUser: {
          ...prev.currentUser,
          name: typeof payload.name === 'string' ? payload.name : prev.currentUser.name,
          avatar: typeof payload.avatar_url !== 'undefined' ? payload.avatar_url || undefined : prev.currentUser.avatar,
        }
      }));
      return { ok: true };
    } catch (e: any) {
      return { ok: false, reason: e.message };
    }
  };

  const signUp: StoreContextType['signUp'] = async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });
    if (error) return { ok: false, reason: error.message };
    // Do not auto sign-in; user must verify email first
    return { ok: true };
  };

  const signOut: StoreContextType['signOut'] = async () => {
    await supabase.auth.signOut();
    await loadSession();
  };

  const refresh = async () => {
    await Promise.all([loadSession()]);
  };

  function simpleId() {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  async function uploadIfNeeded(userId: string, uri: string): Promise<string> {
    if (!uri || uri.startsWith('http')) return uri; // already remote
    if (Platform.OS === 'web' && uri.startsWith('file://')) {
      throw new Error('Cannot upload local file:// paths on web. Please use Pick Image (blob:) or paste an https image URL.');
    }
    // Fetch the local or remote resource and read as ArrayBuffer to support React Native
    const res = await fetch(uri);
    const arrayBuffer = await res.arrayBuffer();
    // Try to infer extension from URI path, fallback to jpg
    const uriLower = uri.toLowerCase();
    let ext = 'jpg';
    if (uriLower.includes('.png')) ext = 'png';
    else if (uriLower.includes('.jpeg') || uriLower.includes('.jpg')) ext = 'jpg';
    else if (uriLower.includes('.webp')) ext = 'webp';
    else if (uriLower.includes('.heic')) ext = 'heic';
    else if (uriLower.includes('.heif')) ext = 'heif';
    // Content type mapping
    const contentType =
      ext === 'png' ? 'image/png' :
      ext === 'webp' ? 'image/webp' :
      ext === 'heic' ? 'image/heic' :
      ext === 'heif' ? 'image/heif' :
      'image/jpeg';
    const filename = `${userId}/${simpleId()}.${ext}`;
    const { error } = await supabase.storage
      .from(POSTS_BUCKET)
      .upload(filename, arrayBuffer, { contentType, upsert: false });
    if (error) {
      // Surface a clearer message if the bucket is missing
      const reason = (error as any)?.message || String(error);
      if (reason?.toLowerCase().includes('bucket') && reason?.toLowerCase().includes('not found')) {
        throw new Error(`Supabase storage bucket "${POSTS_BUCKET}" not found. Create it in your Supabase project (Storage > Create bucket) and make it public or adjust EXPO_PUBLIC_SUPABASE_POSTS_BUCKET.`);
      }
      throw error;
    }
    const { data } = supabase.storage.from(POSTS_BUCKET).getPublicUrl(filename);
    return data.publicUrl;
  }

  // Upload avatar image if needed (null -> clear, undefined -> ignore)
  async function uploadAvatarIfNeeded(userId: string, uri?: string | null): Promise<string | null | undefined> {
    if (typeof uri === 'undefined') return undefined; // ignore
    if (uri === null) return null; // clear avatar
    if (!uri || uri.startsWith('http')) return uri; // already remote
    if (Platform.OS === 'web' && uri.startsWith('file://')) {
      throw new Error('Cannot upload local file:// paths on web. Please use Pick Image (blob:) or paste an https image URL.');
    }
    const res = await fetch(uri);
    const arrayBuffer = await res.arrayBuffer();
    const uriLower = uri.toLowerCase();
    let ext = 'jpg';
    if (uriLower.includes('.png')) ext = 'png';
    else if (uriLower.includes('.jpeg') || uriLower.includes('.jpg')) ext = 'jpg';
    else if (uriLower.includes('.webp')) ext = 'webp';
    else if (uriLower.includes('.heic')) ext = 'heic';
    else if (uriLower.includes('.heif')) ext = 'heif';
    const contentType =
      ext === 'png' ? 'image/png' :
      ext === 'webp' ? 'image/webp' :
      ext === 'heic' ? 'image/heic' :
      ext === 'heif' ? 'image/heif' :
      'image/jpeg';
    const filename = `${userId}/${simpleId()}.${ext}`;
    const { error } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(filename, arrayBuffer, { contentType, upsert: false });
    if (error) {
      const reason = (error as any)?.message || String(error);
      if (reason?.toLowerCase().includes('bucket') && reason?.toLowerCase().includes('not found')) {
        throw new Error(`Supabase storage bucket "${AVATARS_BUCKET}" not found. Create it in your Supabase project (Storage > Create bucket) and make it public or adjust EXPO_PUBLIC_SUPABASE_AVATARS_BUCKET.`);
      }
      throw error;
    }
    const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filename);
    return data.publicUrl;
  }

  const value = useMemo<StoreContextType>(() => ({
    ...state,
    signIn,
    signUp,
    signOut,
    refresh,
    updateProfile,
  }), [state]);

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}