import { supabase } from '@/lib/supabase';
import { haversineDistanceM, boundingBox } from '@/lib/geo';

export type Place = {
  id: string;
  lat: number;
  lng: number;
  title: string | null;
  address: string | null;
};

export type Post = {
  id: string;
  place_id: string;
  image_url: string;
  caption: string | null;
  created_by: string | null;
  created_at: string;
};

export type PostWithPlace = Post & { place: Place };

export async function fetchNearbyPosts(lat: number, lng: number, radiusM = 1000): Promise<PostWithPlace[]> {
  const box = boundingBox(lat, lng, radiusM);
  const { data: places, error: placesErr } = await supabase
    .from('places')
    .select('id, lat, lng, title, address')
    .gte('lat', box.minLat)
    .lte('lat', box.maxLat)
    .gte('lng', box.minLon)
    .lte('lng', box.maxLon);
  if (placesErr) throw placesErr;
  if (!places || places.length === 0) return [];

  // Filter by precise distance
  const closePlaces = places.filter((p) => haversineDistanceM(lat, lng, p.lat, p.lng) <= radiusM);
  if (closePlaces.length === 0) return [];
  const placeIds = closePlaces.map((p) => p.id);

  const { data: posts, error: postsErr } = await supabase
    .from('posts')
    .select('id, place_id, image_url, caption, created_by, created_at')
    .in('place_id', placeIds);
  if (postsErr) throw postsErr;

  const placeById = new Map(closePlaces.map((p) => [p.id, p] as const));
  return (posts ?? []).map((post) => ({ ...post, place: placeById.get(post.place_id)! }));
}

export async function createPlaceAndPost(params: {
  lat: number;
  lng: number;
  title?: string;
  address?: string;
  imageUri: string;
  caption?: string;
  bucket?: string; // default 'post-images'
}): Promise<PostWithPlace> {
  const BUCKET = params.bucket ?? 'post-images';
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw userErr ?? new Error('Not authenticated');
  const userId = userData.user.id;

  // 1) Insert place (will fail if within 10m due to trigger)
  const { data: placeRows, error: placeErr } = await supabase
    .from('places')
    .insert({ lat: params.lat, lng: params.lng, title: params.title ?? null, address: params.address ?? null, created_by: userId })
    .select('id, lat, lng, title, address')
    .single();
  if (placeErr) throw placeErr;

  // 2) Upload image to storage (React Native: avoid blob(); use arrayBuffer instead)
  const fileRes = await fetch(params.imageUri);
  const arrayBuffer = await fileRes.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const ext = params.imageUri.split('.').pop()?.toLowerCase()?.split('?')[0] || 'jpg';
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const filePath = `${userId}/${placeRows.id}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, bytes, { contentType, upsert: false });
  if (upErr) throw upErr;
  const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  // 3) Insert post
  const { data: postRow, error: postErr } = await supabase
    .from('posts')
    .insert({ place_id: placeRows.id, image_url: publicUrl.publicUrl, caption: params.caption ?? null, created_by: userId })
    .select('id, place_id, image_url, caption, created_by, created_at')
    .single();
  if (postErr) throw postErr;

  return { ...postRow, place: placeRows } as PostWithPlace;
}

export async function fetchPostById(id: string): Promise<PostWithPlace | null> {
  const { data: post, error: postErr } = await supabase
    .from('posts')
    .select('id, place_id, image_url, caption, created_by, created_at')
    .eq('id', id)
    .single();
  if (postErr) throw postErr;
  const { data: place, error: placeErr } = await supabase
    .from('places')
    .select('id, lat, lng, title, address')
    .eq('id', post.place_id)
    .single();
  if (placeErr) throw placeErr;
  return { ...post, place } as PostWithPlace;
}

export async function fetchVisitsCount(postId: string): Promise<number> {
  const { count, error } = await supabase
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);
  if (error) throw error;
  return count ?? 0;
}

export async function checkInToPost(params: {
  post: PostWithPlace;
  userLat: number;
  userLng: number;
  method?: 'gps' | 'visual';
}): Promise<void> {
  const distance = Math.round(haversineDistanceM(params.userLat, params.userLng, params.post.place.lat, params.post.place.lng));
  if (distance > 10) throw new Error(`Too far to check in (${distance}m). Get within 10m.`);
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw userErr ?? new Error('Not authenticated');
  const userId = userData.user.id;
  const { error } = await supabase
    .from('visits')
    .insert({ post_id: params.post.id, user_id: userId, method: params.method ?? 'gps', distance_m: distance });
  if (error) throw error;
}
