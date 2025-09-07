import { useQuery } from '@tanstack/react-query';
import { getFunctionHeaders } from '@/lib/utils';

// =============================================================================
// AGENTS HOOKS
// Integrates with our 97% functional backend agents endpoint
// =============================================================================

interface Agent {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  agentType: 'ORGANISATION' | 'INDIVIDUAL';
  status: 'ACTIVE' | 'INACTIVE';
  commissionRate?: number;
  address?: string;
  country?: string;
}

interface AgentsResponse {
  data: Agent[];
}

// Base URL for our Supabase functions
const BASE_URL = 'http://127.0.0.1:54321/functions/v1';

// Hook for fetching all active agents
export const useAgents = () => {
  return useQuery<AgentsResponse>({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/agents`, {
        headers: getFunctionHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      const raw = await response.json();
      const list = Array.isArray(raw) ? raw : raw?.data ?? [];

      const normalized: Agent[] = list.map((item: any) => {
        const statusRaw = (item.status ?? '').toString().toUpperCase();
        const status: 'ACTIVE' | 'INACTIVE' = statusRaw === 'ACTIVE' ? 'ACTIVE' : statusRaw === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
        const agentTypeRaw = (item.agent_type ?? item.agentType ?? '').toString().toUpperCase();
        const agentType: 'ORGANISATION' | 'INDIVIDUAL' = agentTypeRaw === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'ORGANISATION';
        return {
          id: item.id,
          name: item.agent_name ?? item.name ?? '',
          email: item.primary_contact_email ?? item.email ?? '',
          phone: item.primary_contact_phone ?? item.phone ?? '',
          company: item.agent_name ?? item.company ?? undefined,
          agentType,
          status,
          commissionRate: item.commission_rate != null ? Number(item.commission_rate) : item.commissionRate,
          address: item.address,
          country: item.country,
        } as Agent;
      });

      return { data: normalized } as AgentsResponse;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Helper function to transform agents for select components
export const transformAgentsForSelect = (data: AgentsResponse | undefined) => {
  if (!data?.data) return [];
  
  return data.data.map(agent => ({
    value: agent.id,
    label: agent.name,
    description: agent.company || agent.email || '',
    agentType: agent.agentType,
    status: agent.status,
    commissionRate: agent.commissionRate,
  }));
};

// Helper function to find agent by ID
export const findAgentById = (
  data: AgentsResponse | undefined, 
  agentId: string
): Agent | undefined => {
  if (!data?.data) return undefined;
  
  return data.data.find(agent => agent.id === agentId);
};

// Helper function to get agent display name
export const getAgentDisplayName = (agent: Agent | undefined): string => {
  if (!agent) return '';
  
  if (agent.agentType === 'ORGANISATION') {
    return agent.company || agent.name;
  }
  
  return agent.name;
};
