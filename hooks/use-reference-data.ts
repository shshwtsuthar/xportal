import { useQuery } from '@tanstack/react-query';
import { getCountries, getLanguages, ReferenceCode } from '@/lib/data/countries-languages';

// =============================================================================
// REFERENCE DATA HOOKS
// Integrates with our 97% functional backend reference data endpoints
// Uses local data for countries and languages via i18n-iso-countries package
// =============================================================================

interface ReferenceDataItem {
  code: string;
  description: string;
}

interface ReferenceDataResponse {
  data: ReferenceDataItem[];
}

// Base URL for our Supabase functions
const BASE_URL = 'http://127.0.0.1:54321/functions/v1';

// Generic hook for fetching reference data from backend
const useReferenceData = (codeType: string) => {
  return useQuery<ReferenceDataResponse>({
    queryKey: ['reference-data', codeType],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/reference-data/${codeType}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${codeType} data`);
      }
      const raw = await response.json();
      // Normalize array responses to { data: [...] }
      if (Array.isArray(raw)) {
        return { data: raw } as ReferenceDataResponse;
      }
      return raw as ReferenceDataResponse;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Countries hook - uses local data from i18n-iso-countries package
export const useCountries = () => {
  return useQuery<ReferenceDataResponse>({
    queryKey: ['reference-data', 'countries'],
    queryFn: async () => {
      const countries = getCountries();
      return { data: countries };
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (countries don't change often)
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });
};

// Languages hook - uses local data
export const useLanguages = () => {
  return useQuery<ReferenceDataResponse>({
    queryKey: ['reference-data', 'languages'],
    queryFn: async () => {
      const languages = getLanguages();
      return { data: languages };
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (languages don't change often)
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });
};

// Backend API hooks for other reference data types
export const useDisabilityTypes = () => useReferenceData('disability_types');
export const usePriorEducation = () => useReferenceData('prior_education');
export const useFundingSources = () => useReferenceData('funding_sources');
export const useStudyReasons = () => useReferenceData('study_reasons');

// Helper function to transform reference data for select components
export const transformReferenceData = (data: ReferenceDataResponse | undefined) => {
  if (!data?.data) return [];
  
  return data.data.map(item => ({
    value: item.code,
    label: `${item.code} - ${item.description}`,
    description: item.description,
  }));
};

// Helper function to find description by code
export const findDescriptionByCode = (
  data: ReferenceDataResponse | undefined, 
  code: string
): string => {
  if (!data?.data) return '';
  
  const item = data.data.find(item => item.code === code);
  return item?.description || '';
};
