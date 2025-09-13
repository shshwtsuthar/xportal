import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getFunctionHeaders, FUNCTIONS_URL } from '@/lib/functions';

export interface PaymentPlanTemplate { id: string; program_id: string; name: string; is_default: boolean; }
export interface PaymentPlanInstalment { description: string; amount: number; offset_days: number; sort_order: number; }

export const usePaymentPlanTemplates = (programId: string | undefined) => {
  return useQuery<PaymentPlanTemplate[]>({
    queryKey: ['payment-templates', programId],
    enabled: !!programId,
    queryFn: async () => {
      const res = await fetch(`${FUNCTIONS_URL}/payment-plan-templates/programs/${programId}/payment-plan-templates`, {
        headers: getFunctionHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load templates');
      return res.json();
    },
  });
};

export const useCreatePaymentPlanTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { programId: string; name: string; is_default?: boolean }) => {
      const res = await fetch(`${FUNCTIONS_URL}/payment-plan-templates/programs/${payload.programId}/payment-plan-templates`, {
        method: 'POST',
        headers: { ...getFunctionHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: payload.name, is_default: payload.is_default ?? false }),
      });
      if (!res.ok) throw new Error('Failed to create template');
      return res.json();
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['payment-templates', vars.programId] }),
  });
};

export const useTemplateInstalments = (templateId: string | undefined) => {
  return useQuery<PaymentPlanInstalment[]>({
    queryKey: ['template-instalments', templateId],
    enabled: !!templateId,
    queryFn: async () => {
      const res = await fetch(`${FUNCTIONS_URL}/payment-plan-templates/${templateId}/instalments`, {
        headers: getFunctionHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load instalments');
      return res.json();
    },
  });
};

export const useReplaceInstalments = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { templateId: string; items: PaymentPlanInstalment[] }) => {
      const res = await fetch(`${FUNCTIONS_URL}/payment-plan-templates/${payload.templateId}/instalments`, {
        method: 'PUT',
        headers: { ...getFunctionHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.items),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['template-instalments', vars.templateId] }),
  });
};

export const useSetTemplateDefault = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { templateId: string; programId: string; is_default: boolean }) => {
      const res = await fetch(`${FUNCTIONS_URL}/payment-plan-templates/${payload.templateId}`, {
        method: 'PATCH',
        headers: { ...getFunctionHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: payload.is_default }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['payment-templates', vars.programId] });
    }
  });
};


