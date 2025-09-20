import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { Product, StoreState, User } from './types';
import { supabase } from '@/lib/supabase';

// Storage bucket for post images (configurable via env)
const POSTS_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_POSTS_BUCKET || 'post-images';
const AVATARS_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_AVATARS_BUCKET || 'avatars';

type StoreContextType = StoreState & {
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  userPosts: (userId: string) => Product[];
  getPost: (postId: string) => Product | undefined;
  createPost: (input: {
    title: string;
    description?: string;
    imageUri: string;
    price: number;
    condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
    category: string;
    status?: 'active' | 'sold' | 'inactive';
  }) => Promise<{ ok: true; id: string } | { ok: false; reason: string }>;
  deletePost: (postId: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  updateProfile: (input: { name?: string; phone?: string; avatarUri?: string | null }) => Promise<{ ok: true } | { ok: false; reason: string }>;
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
  const [state, setState] = useState<StoreState>({ currentUser: { id: '', name: '' }, posts: [] });

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
      const user: User = { id: uid, name: (profile?.name) || (session.user.user_metadata as any)?.name || session.user.email || 'User', avatar: profile?.avatar_url, phone: profile?.phone || undefined };
      setState((prev) => ({ ...prev, currentUser: user }));
    } else {
      setState((prev) => ({ ...prev, currentUser: { id: '', name: '' } }));
    }
  }, []);

  const loadPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, user_id, title, description, image_url, price, condition, category, status, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[loadPosts] Supabase error:', error);
    }
    if (!error && data) {
      const posts: Product[] = data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        description: row.description || undefined,
        imageUri: row.image_url,
        price: typeof row.price === 'number' ? row.price : parseFloat(row.price) || 0,
        condition: row.condition || 'Good',
        category: row.category || 'Other',
        status: row.status || 'active',
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: new Date(row.updated_at || row.created_at).getTime(),
      }));
      setState((prev) => ({ ...prev, posts }));
    }
  }, []);

  useEffect(() => {
    loadSession();
    loadPosts();
    // Realtime subscription for products
    const channel = supabase.channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadPosts())
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
      if (typeof input.phone === 'string') payload.phone = input.phone;
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
          phone: typeof payload.phone === 'string' ? payload.phone : prev.currentUser.phone,
        }
      }));
      return { ok: true };
    } catch (e: any) {
      return { ok: false, reason: e.message };
    }
  };

  const deletePost: StoreContextType['deletePost'] = async (postId) => {
    try {
      if (!state.currentUser.id) return { ok: false, reason: 'Not signed in' };
      const post = state.posts.find(p => p.id === postId);
      if (!post) return { ok: false, reason: 'Post not found' };
      if (post.userId !== state.currentUser.id) return { ok: false, reason: 'You can only delete your own post' };

      // Try to delete the associated image if it's in our bucket
      try {
        const url = post.imageUri || '';
        const marker = `/object/public/${POSTS_BUCKET}/`;
        const idx = url.indexOf(marker);
        if (idx !== -1) {
          const path = url.slice(idx + marker.length);
          if (path) {
            await supabase.storage.from(POSTS_BUCKET).remove([path]);
          }
        }
      } catch (e) {
        // Non-fatal: image might not be in our bucket or already deleted
        console.warn('[deletePost] image cleanup warning:', (e as any)?.message || e);
      }
      const { error } = await supabase.from('products').delete().eq('id', postId);
      if (error) return { ok: false, reason: error.message };
      await loadPosts();
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

  const createPost: StoreContextType['createPost'] = async (input) => {
    try {
      if (!state.currentUser.id) return { ok: false, reason: 'Not signed in' };
      const image_url = await uploadIfNeeded(state.currentUser.id, input.imageUri);
      const { data, error } = await supabase
        .from('products')
        .insert([
          {
            title: input.title,
            description: input.description ?? null,
            image_url,
            price: input.price,
            condition: input.condition,
            category: input.category,
            status: input.status ?? 'active',
            user_id: state.currentUser.id,
          }
        ])
        .select();
      if (error) return { ok: false, reason: error.message };
      await loadPosts();
      return { ok: true, id: data?.[0]?.id };
    } catch (e: any) {
      return { ok: false, reason: e.message };
    }
  };

  const userPosts = useCallback((userId: string) => state.posts.filter((p) => p.userId === userId).sort((a,b) => b.createdAt - a.createdAt), [state.posts]);
  const getPost = useCallback((postId: string) => state.posts.find((p) => p.id === postId), [state.posts]);

  const value = useMemo<StoreContextType>(() => ({
    ...state,
    signIn,
    signUp,
    signOut,
    refresh,
    userPosts,
    getPost,
    createPost,
    deletePost,
    updateProfile,
  }), [state]);

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}