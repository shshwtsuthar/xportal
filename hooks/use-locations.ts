import { useQuery } from '@tanstack/react-query';
import { getFunctionHeaders } from '@/lib/utils';

type Location = {
	id: string;
	identifier: string;
	name: string;
};

type SelectOption = { value: string; label: string };

const BASE_URL = 'http://127.0.0.1:54321/functions/v1';

export const useLocations = () => {
	return useQuery<Location[], Error>({
		queryKey: ['locations'],
		queryFn: async () => {
			const res = await fetch(`${BASE_URL}/locations`, { headers: getFunctionHeaders() });
			if (!res.ok) throw new Error('Failed to load locations');
			return (await res.json()) as Location[];
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
	});
};

export const transformLocationsForSelect = (locations?: Location[] | null): SelectOption[] => {
	if (!locations || locations.length === 0) return [];
	return locations.map((loc) => ({ value: loc.id, label: `${loc.name} (${loc.identifier})` }));
};

