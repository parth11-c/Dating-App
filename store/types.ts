export type User = {
  id: string;
  name: string;
  avatar?: string;
};

export type StoreState = {
  currentUser: User;
  themeMode: 'dark' | 'light' | 'system';
};
