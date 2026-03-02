export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
}

export interface Demo {
  id: number;
  name: string;
  genre: 'pop' | 'folk' | 'rock' | 'pop/folk';
  url: string;
  created_at: string;
}

export type SortOrder = 'newest' | 'oldest';
