 export type Product = {
  id: string;
  userId: string;
  title: string;
  description?: string;
  imageUri: string; // mapped from image_url
  price: number;
  condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
  category: string;
  status: 'active' | 'sold' | 'inactive';
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
};

export type User = {
  id: string;
  name: string;
  avatar?: string;
  phone?: string;
};

export type StoreState = {
  currentUser: User;
  posts: Product[]; // keeping name 'posts' in state to minimize refactor across UI
};
