import { useQuery } from '@tanstack/react-query';

export type WhatsAppTemplate = {
  sid: string;
  name: string;
  variables: string[]; // variable names expected
};

async function fetchTemplates(): Promise<WhatsAppTemplate[]> {
  const res = await fetch('/api/communications/whatsapp/templates', {
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load templates');
  }
  return (data.templates || []) as WhatsAppTemplate[];
}

export function useListTemplates() {
  return useQuery<WhatsAppTemplate[], Error>({
    queryKey: ['whatsapp', 'templates'],
    queryFn: fetchTemplates,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
