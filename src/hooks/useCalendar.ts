import { useState, useEffect, useCallback } from 'react';
import { InstagramPost, PostStatus } from '../types';
import { storage } from '../utils/storage';

export function useCalendar() {
  const [posts, setPosts] = useState<InstagramPost[]>([]);

  const refresh = useCallback(() => {
    setPosts(storage.getAllPosts());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addPost = useCallback((post: Omit<InstagramPost, 'id'>) => {
    const newPost = storage.addPost(post);
    setPosts(prev => [...prev, newPost]);
    return newPost;
  }, []);

  const updatePost = useCallback((id: string, updates: Partial<InstagramPost>) => {
    const updated = storage.updatePost(id, updates);
    if (updated) {
      setPosts(prev => prev.map(p => (p.id === id ? updated : p)));
    }
    return updated;
  }, []);

  const deletePost = useCallback((id: string) => {
    const success = storage.deletePost(id);
    if (success) {
      setPosts(prev => prev.filter(p => p.id !== id));
    }
    return success;
  }, []);

  const getPostsByStatus = useCallback((status: PostStatus) => {
    return posts.filter(p => p.status === status);
  }, [posts]);

  const getPostsByDate = useCallback((date: string) => {
    return posts.filter(p => p.scheduledDate?.startsWith(date));
  }, [posts]);

  const getGridPosts = useCallback(() => {
    // Get last 9 posts for Instagram grid preview
    return [...posts]
      .filter(p => p.status !== 'draft')
      .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
      .slice(0, 9);
  }, [posts]);

  return {
    posts,
    refresh,
    addPost,
    updatePost,
    deletePost,
    getPostsByStatus,
    getPostsByDate,
    getGridPosts,
    draftCount: posts.filter(p => p.status === 'draft').length,
    scheduledCount: posts.filter(p => p.status === 'scheduled').length,
  };
}
