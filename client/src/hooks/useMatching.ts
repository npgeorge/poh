import { useQuery } from '@tanstack/react-query';

interface Printer {
  id: number;
  userId: string;
  name: string;
  location: string;
  materials: string[];
  pricePerGram: string;
  status: string;
  description: string | null;
  rating: string;
  completedJobs: number;
  createdAt: string;
}

export interface MatchScore {
  printer: Printer;
  score: number;
  reasons: string[];
  estimatedCost: number;
}

export function useJobMatches(jobId: number | undefined, limit: number = 10) {
  return useQuery({
    queryKey: ['job-matches', jobId, limit],
    queryFn: async () => {
      if (!jobId) return { matches: [], total: 0 };
      const response = await fetch(`/api/jobs/${jobId}/matches?limit=${limit}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch matches');
      }
      return response.json() as Promise<{
        jobId: number;
        matches: MatchScore[];
        total: number;
      }>;
    },
    enabled: !!jobId,
  });
}

export function useBestMatch(jobId: number | undefined) {
  return useQuery({
    queryKey: ['best-match', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const response = await fetch(`/api/jobs/${jobId}/best-match`, {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch best match');
      }
      return response.json() as Promise<MatchScore>;
    },
    enabled: !!jobId,
  });
}
