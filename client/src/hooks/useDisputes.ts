import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Dispute {
  id: number;
  jobId: number;
  initiatorId: string;
  respondentId: string;
  type: string;
  description: string;
  status: 'open' | 'resolved' | 'escalated';
  resolution: string | null;
  resolvedBy: string | null;
  evidenceUrls: string[] | null;
  createdAt: string;
  resolvedAt: string | null;
}

interface CreateDisputeData {
  jobId: number;
  type: string;
  description: string;
  evidenceUrls?: string[];
}

interface ResolveDisputeData {
  disputeId: number;
  resolution: string;
  releaseEscrow?: boolean;
}

export function useMyDisputes() {
  return useQuery({
    queryKey: ['my-disputes'],
    queryFn: async () => {
      const response = await fetch('/api/disputes/my', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch disputes');
      }
      return response.json() as Promise<Dispute[]>;
    },
  });
}

export function useJobDisputes(jobId: number | undefined) {
  return useQuery({
    queryKey: ['job-disputes', jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const response = await fetch(`/api/disputes/job/${jobId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch job disputes');
      }
      return response.json() as Promise<Dispute[]>;
    },
    enabled: !!jobId,
  });
}

export function useDispute(disputeId: number | undefined) {
  return useQuery({
    queryKey: ['dispute', disputeId],
    queryFn: async () => {
      if (!disputeId) return null;
      const response = await fetch(`/api/disputes/${disputeId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch dispute');
      }
      return response.json() as Promise<Dispute>;
    },
    enabled: !!disputeId,
  });
}

export function useCreateDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDisputeData) => {
      const response = await fetch('/api/disputes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create dispute');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['escrow'] });
    },
  });
}

export function useResolveDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ disputeId, resolution, releaseEscrow }: ResolveDisputeData) => {
      const response = await fetch(`/api/disputes/${disputeId}/resolve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, releaseEscrow }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to resolve dispute');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['escrow'] });
    },
  });
}

export function useUpdateDispute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ disputeId, updates }: { disputeId: number; updates: Partial<Dispute> }) => {
      const response = await fetch(`/api/disputes/${disputeId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update dispute');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
    },
  });
}
