import { useState } from 'react';
import { cacheService } from './cache';

interface TranscriptSegment {
  text: string;
  offset: number;
}

export interface AdSegment {
  start: number;
  end: number;
  text: string;
}

export interface VideoData {
  transcript: TranscriptSegment[];
  adSegments: AdSegment[];
}

interface UseVideoDataReturn {
  data: VideoData | null;
  loading: boolean;
  error: string | null;
  fetchData: (videoId: string) => Promise<void>;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const useVideoData = (): UseVideoDataReturn => {
  const [data, setData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (videoId: string) => {
    try {
      // Check cache first
      const cachedData = cacheService.get(videoId);
      if (cachedData) {
        setData(cachedData);
        return;
      }

      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/analyze-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch video data');
      }

      const result = await response.json();
      
      // Cache the result
      cacheService.set(videoId, result);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    fetchData,
  };
}; 