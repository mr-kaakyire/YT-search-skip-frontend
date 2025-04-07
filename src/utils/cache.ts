import { VideoData } from './useVideoData';

const CACHE_PREFIX = 'yt-adskip-cache-';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CacheEntry {
  data: VideoData;
  timestamp: number;
}

export const cacheService = {
  get: (videoId: string): VideoData | null => {
    try {
      const cacheKey = CACHE_PREFIX + videoId;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (!cachedData) return null;
      
      const entry: CacheEntry = JSON.parse(cachedData);
      const now = Date.now();
      
      // Check if cache is expired
      if (now - entry.timestamp > CACHE_TTL) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      return entry.data;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  },
  
  set: (videoId: string, data: VideoData): void => {
    try {
      const cacheKey = CACHE_PREFIX + videoId;
      const entry: CacheEntry = {
        data,
        timestamp: Date.now(),
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  },
  
  clear: (videoId: string): void => {
    try {
      const cacheKey = CACHE_PREFIX + videoId;
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  },
}; 