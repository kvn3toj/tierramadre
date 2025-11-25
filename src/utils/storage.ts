import { AppState, Emerald, InstagramPost } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'tierra-madre-data';

const defaultState: AppState = {
  emeralds: [],
  posts: [],
  settings: {},
};

export const storage = {
  get(): AppState {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : defaultState;
    } catch {
      return defaultState;
    }
  },

  set(state: AppState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new Error('STORAGE_FULL: El almacenamiento está lleno. Por favor elimina algunas esmeraldas antiguas.');
      }
      throw error;
    }
  },

  // Get storage usage info
  getStorageInfo(): { used: number; available: number; percentage: number } {
    const data = localStorage.getItem(STORAGE_KEY) || '';
    const used = new Blob([data]).size;
    const total = 5 * 1024 * 1024; // ~5MB typical localStorage limit
    return {
      used: Math.round(used / 1024), // KB
      available: Math.round((total - used) / 1024), // KB
      percentage: Math.round((used / total) * 100),
    };
  },

  // Emerald operations
  addEmerald(emerald: Omit<Emerald, 'id' | 'createdAt' | 'updatedAt'>): Emerald {
    const state = this.get();
    const newEmerald: Emerald = {
      ...emerald,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.emeralds.push(newEmerald);
    this.set(state);
    return newEmerald;
  },

  updateEmerald(id: string, updates: Partial<Emerald>): Emerald | null {
    const state = this.get();
    const index = state.emeralds.findIndex(e => e.id === id);
    if (index === -1) return null;

    state.emeralds[index] = {
      ...state.emeralds[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.set(state);
    return state.emeralds[index];
  },

  deleteEmerald(id: string): boolean {
    const state = this.get();
    const index = state.emeralds.findIndex(e => e.id === id);
    if (index === -1) return false;

    state.emeralds.splice(index, 1);
    // Also delete related posts
    state.posts = state.posts.filter(p => p.emeraldId !== id);
    this.set(state);
    return true;
  },

  getEmerald(id: string): Emerald | undefined {
    return this.get().emeralds.find(e => e.id === id);
  },

  getAllEmeralds(): Emerald[] {
    return this.get().emeralds;
  },

  // Post operations
  addPost(post: Omit<InstagramPost, 'id'>): InstagramPost {
    const state = this.get();
    const newPost: InstagramPost = {
      ...post,
      id: uuidv4(),
    };
    state.posts.push(newPost);
    this.set(state);
    return newPost;
  },

  updatePost(id: string, updates: Partial<InstagramPost>): InstagramPost | null {
    const state = this.get();
    const index = state.posts.findIndex(p => p.id === id);
    if (index === -1) return null;

    state.posts[index] = {
      ...state.posts[index],
      ...updates,
    };
    this.set(state);
    return state.posts[index];
  },

  deletePost(id: string): boolean {
    const state = this.get();
    const index = state.posts.findIndex(p => p.id === id);
    if (index === -1) return false;

    state.posts.splice(index, 1);
    this.set(state);
    return true;
  },

  getAllPosts(): InstagramPost[] {
    return this.get().posts;
  },

  // Settings
  setApiKey(key: string): void {
    const state = this.get();
    state.settings.anthropicApiKey = key;
    this.set(state);
  },

  getApiKey(): string | undefined {
    return this.get().settings.anthropicApiKey;
  },

  // Clear all data
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};
