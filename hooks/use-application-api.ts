import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getFunctionHeaders } from '@/lib/utils';

const BASE_URL = 'http://127.0.0.1:54321/functions/v1';

// Lightweight ETag store per application
const getEtagKey = (id: string) => `app-etag:${id}`;
const readEtag = (id: string) => (typeof window !== 'undefined' ? localStorage.getItem(getEtagKey(id)) : null);
const writeEtag = (id: string, etag?: string | null) => {
  if (typeof window === 'undefined') return;
  if (!etag) return;
  localStorage.setItem(getEtagKey(id), etag);
};

export const useCreateApplication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: unknown) => {
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch(`${BASE_URL}/applications`, {
        method: 'POST',
        headers: { ...getFunctionHeaders(), 'Idempotency-Key': idempotencyKey },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      if (!res.ok) throw new Error('Failed to create application');
      const etag = res.headers.get('ETag');
      const data = await res.json();
      if (data?.id && etag) writeEtag(data.id, etag);
      return data as { id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
    },
  });
};

export const usePatchApplication = (applicationId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: unknown) => {
      const etag = readEtag(applicationId);
      const res = await fetch(`${BASE_URL}/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { ...getFunctionHeaders(), ...(etag ? { 'If-Match': etag } : {}) },
        body: JSON.stringify(payload ?? {}),
      });
      if (res.status === 412 || res.status === 409) {
        // ETag conflict; let caller decide how to resolve
        const err: any = new Error('ETag conflict');
        err.code = 412;
        throw err;
      }
      if (!res.ok) throw new Error('Failed to save draft');
      const newEtag = res.headers.get('ETag');
      if (newEtag) writeEtag(applicationId, newEtag);
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application', applicationId] });
    },
  });
};

export const useSubmitApplication = (applicationId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE_URL}/applications/${applicationId}/submit`, {
        method: 'POST',
        headers: getFunctionHeaders(),
      });
      if (!res.ok) throw new Error('Failed to submit application');
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application', applicationId] });
    },
  });
};

export const useApproveApplication = (applicationId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE_URL}/applications/${applicationId}/approve`, { method: 'POST', headers: getFunctionHeaders() });
      if (!res.ok) throw new Error('Failed to approve application');
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application', applicationId] });
    },
  });
};

export const useDeleteApplication = (applicationId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE_URL}/applications/${applicationId}`, { 
        method: 'DELETE', 
        headers: getFunctionHeaders() 
      });
      if (!res.ok) throw new Error('Failed to delete application');
      return null; // DELETE returns 204 No Content
    },
    onSuccess: () => {
      // Invalidate all application-related queries since the application is deleted
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['application', applicationId] });
      // Clear ETag for this application
      if (typeof window !== 'undefined') {
        localStorage.removeItem(getEtagKey(applicationId));
      }
    },
  });
};


