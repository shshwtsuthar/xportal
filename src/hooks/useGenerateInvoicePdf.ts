import { useMutation } from '@tanstack/react-query';

type Params = {
  invoiceId: string;
};

type Response = {
  filePath: string;
  signedUrl: string;
};

/**
 * Hook to generate invoice PDF on-demand.
 * If PDF already exists, returns existing signed URL.
 * Otherwise generates PDF, uploads to storage, and returns download URL.
 * Follows the same pattern as useGenerateOfferLetter.
 */
export const useGenerateInvoicePdf = () => {
  return useMutation<Response, Error, Params>({
    mutationFn: async ({ invoiceId }) => {
      const res = await fetch(`/api/invoices/${invoiceId}/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const msg =
          (await res.json().catch(() => ({ error: res.statusText })))?.error ||
          res.statusText;
        throw new Error(msg || 'Failed to generate invoice PDF');
      }

      return res.json();
    },
  });
};
