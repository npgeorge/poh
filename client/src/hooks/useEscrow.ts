import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Escrow {
  id: number;
  jobId: number;
  amount: string;
  status: 'held' | 'released' | 'disputed';
  releaseCondition: string | null;
  heldAt: string;
  releasedAt: string | null;
}

export function useEscrow(jobId: number | undefined) {
  return useQuery({
    queryKey: ['escrow', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const response = await fetch(`/api/escrow/job/${jobId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch escrow');
      }
      return response.json() as Promise<Escrow>;
    },
    enabled: !!jobId,
  });
}

export function useReleaseEscrow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (escrowId: number) => {
      const response = await fetch(`/api/escrow/${escrowId}/release`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to release escrow');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrow'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useHoldEscrow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ escrowId, reason }: { escrowId: number; reason?: string }) => {
      const response = await fetch(`/api/escrow/${escrowId}/hold`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to hold escrow');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrow'] });
    },
  });
}
