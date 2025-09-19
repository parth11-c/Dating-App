import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { LatLng } from '@/lib/geo';
import type { Post, StoreState, User, Visitor } from './types';
import { supabase } from '@/lib/supabase';

type StoreContextType = StoreState & {
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  createPost: (input: { title: string; description?: string; imageUri: string; location: LatLng }) => Promise<{ ok: true; id: string } | { ok: false; reason: string }>;
  verifyVisit: (postId: string, userLocation: LatLng) => Promise<{ ok: true } | { ok: false; reason: string }>;
  userPosts: (userId: string) => Post[];
  getPost: (postId: string) => Post | undefined;
  deletePost: (postId: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
};

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoreState>({ currentUser: { id: '', name: '' }, posts: [] });

  // Helpers
  const loadSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const uid = session.user.id;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', uid).single();
      const user: User = { id: uid, name: profile?.name || session.user.email || 'User', avatar: profile?.avatar_url };
      setState((prev) => ({ ...prev, currentUser: user }));
    } else {
      setState((prev) => ({ ...prev, currentUser: { id: '', name: '' } }));
    }
  }, []);

  const loadPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('id, user_id, title, description, image_url, created_at, location')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[loadPosts] Supabase error:', error);
    }
    if (!error && data) {
      const posts: Post[] = data.map((row: any) => {
        let lat = 0;
        let lon = 0;
        const loc = row.location;
        try {
          if (loc && Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
            // GeoJSON { type: 'Point', coordinates: [lon, lat] }
            lon = Number(loc.coordinates[0]);
            lat = Number(loc.coordinates[1]);
          } else if (loc && typeof loc === 'string') {
            // WKT string: 'POINT(lon lat)'
            const m = loc.match(/POINT\s*\(\s*([+-]?[0-9]*\.?[0-9]+)\s+([+-]?[0-9]*\.?[0-9]+)\s*\)/i);
            if (m) {
              lon = Number(m[1]);
              lat = Number(m[2]);
            }
          } else if (loc && typeof loc === 'object' && 'x' in loc && 'y' in loc) {
            // Possible { x: lon, y: lat }
            lon = Number((loc as any).x);
            lat = Number((loc as any).y);
          }
        } catch (e) {
          console.warn('[loadPosts] Could not parse location for row', row.id, loc);
        }
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          lat = 0;
          lon = 0;
        }
        return {
          id: row.id,
          userId: row.user_id,
          title: row.title,
          description: row.description || undefined,
          imageUri: row.image_url,
          location: { lat, lon },
          createdAt: new Date(row.created_at).getTime(),
          visitors: [],
        } as Post;
      });
      setState((prev) => ({ ...prev, posts }));
    }
  }, []);

  useEffect(() => {
    loadSession();
    loadPosts();
    // Realtime subscription for posts
    const channel = supabase.channel('posts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => loadPosts())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [loadSession, loadPosts]);

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
    await Promise.all([loadSession(), loadPosts()]);
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
      .from('post-images')
      .upload(filename, arrayBuffer, { contentType, upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('post-images').getPublicUrl(filename);
    return data.publicUrl;
  }

  const createPost: StoreContextType['createPost'] = async (input) => {
    try {
      if (!state.currentUser.id) return { ok: false, reason: 'Not signed in' };
      // Validate coordinates to avoid storing 0,0 or invalid values
      if (!Number.isFinite(input.location.lat) || !Number.isFinite(input.location.lon)) {
        return { ok: false, reason: 'Invalid coordinates. Please enter a valid latitude and longitude.' };
      }
      if (input.location.lat === 0 && input.location.lon === 0) {
        return { ok: false, reason: 'Coordinates cannot be 0,0. Please use valid location values.' };
      }
      // Upload image if needed
      const image_url = await uploadIfNeeded(state.currentUser.id, input.imageUri);
      // Use RPC to construct geography server-side
      const { data, error } = await supabase.rpc('create_post', {
        p_title: input.title,
        p_description: input.description ?? null,
        p_image_url: image_url,
        p_lat: input.location.lat,
        p_lon: input.location.lon,
      });
      if (error) return { ok: false, reason: error.message };
      await loadPosts();
      return { ok: true, id: String(data) };
    } catch (e: any) {
      return { ok: false, reason: e.message };
    }
  };

  const verifyVisit: StoreContextType['verifyVisit'] = async (postId, userLocation) => {
    try {
      if (!state.currentUser.id) return { ok: false, reason: 'Not signed in' };
      const { error } = await supabase.rpc('verify_visit', {
        p_post_id: postId,
        p_lat: userLocation.lat,
        p_lon: userLocation.lon,
      });
      if (error) return { ok: false, reason: error.message };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, reason: e.message };
    }
  };

  const userPosts = useCallback((userId: string) => state.posts.filter((p) => p.userId === userId).sort((a,b) => b.createdAt - a.createdAt), [state.posts]);
  const getPost = useCallback((postId: string) => state.posts.find((p) => p.id === postId), [state.posts]);

  const deletePost: StoreContextType['deletePost'] = async (postId) => {
    try {
      if (!state.currentUser.id) return { ok: false, reason: 'Not signed in' };
      // Attempt to delete the post. RLS should ensure only the owner can delete.
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);
      if (error) return { ok: false, reason: error.message };
      await loadPosts();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, reason: e.message };
    }
  };

  const value = useMemo<StoreContextType>(() => ({
    ...state,
    signIn,
    signUp,
    signOut,
    refresh,
    createPost,
    verifyVisit,
    userPosts,
    getPost,
    deletePost,
  }), [state, signIn, signUp, signOut, createPost, verifyVisit, userPosts, getPost, deletePost]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
