import { useMutation } from '@tanstack/react-query';

type Params = {
  invoiceId: string;
};

/**
 * Hook to generate and download invoice PDF on-demand.
 * Generates PDF and triggers browser download.
 */
export const useGenerateInvoicePdf = () => {
  return useMutation<void, Error, Params>({
    mutationFn: async ({ invoiceId }) => {
      const res = await fetch(`/api/invoices/${invoiceId}/generate-pdf`, {
        method: 'POST',
      });

      if (!res.ok) {
        const msg =
          (await res.json().catch(() => ({ error: res.statusText })))?.error ||
          res.statusText;
        throw new Error(msg || 'Failed to generate invoice PDF');
      }

      // Get PDF blob and create download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
};
