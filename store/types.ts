import type { LatLng } from '@/lib/geo';

export type Visitor = {
  userId: string;
  visitedAt: number; // epoch ms
};

export type Post = {
  id: string;
  userId: string;
  title: string;
  description?: string;
  imageUri: string;
  location: LatLng;
  createdAt: number; // epoch ms
  visitors: Visitor[];
};

export type User = {
  id: string;
  name: string;
  avatar?: string;
};

export type StoreState = {
  currentUser: User;
  posts: Post[];
};
