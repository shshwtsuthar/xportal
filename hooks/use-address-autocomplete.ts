// =============================================================================
// HOOK: useAddressAutocomplete
// Purpose: Provides address autocomplete functionality for forms
// =============================================================================

import { useState, useCallback, useRef } from 'react';
import { getFunctionHeaders } from '@/lib/utils';

// Local type definition for address autocomplete response
interface AddressableAddress {
  streetNumber: string;
  streetName: string;
  unitDetails?: string;
  buildingName?: string;
  suburb: string;
  state: string;
  postcode: string;
  formatted: string;
}

interface UseAddressAutocompleteOptions {
  debounceMs?: number;
  minQueryLength?: number;
  country?: 'AU' | 'NZ';
  maxResults?: number;
}

interface UseAddressAutocompleteReturn {
  suggestions: AddressableAddress[];
  loading: boolean;
  error: string | null;
  searchAddresses: (query: string) => Promise<void>;
  clearSuggestions: () => void;
}

export const useAddressAutocomplete = (
  options: UseAddressAutocompleteOptions = {}
): UseAddressAutocompleteReturn => {
  const {
    debounceMs = 300,
    minQueryLength = 3,
    country = 'AU',
    maxResults = 5,
  } = options;

  const [suggestions, setSuggestions] = useState<AddressableAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const searchAddresses = useCallback(async (query: string) => {
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear suggestions if query is too short
    if (query.length < minQueryLength) {
      setSuggestions([]);
      setError(null);
      return;
    }

    // Debounce the search
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();

        // Call our Supabase Edge Function using the same pattern as other app functions
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/address-autocomplete?` +
          new URLSearchParams({
            query: query.trim(),
            country,
            maxResults: maxResults.toString(),
          }),
          {
            method: 'GET',
            headers: {
              ...getFunctionHeaders(),
            },
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data: AddressableAddress[] = await response.json();
        setSuggestions(data);
      } catch (err) {
        // Don't set error if request was aborted
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        
        const errorMessage = err instanceof Error ? err.message : 'Failed to search addresses';
        setError(errorMessage);
        setSuggestions([]);
        console.error('Address autocomplete error:', err);
      } finally {
        setLoading(false);
      }
    }, debounceMs);
  }, [minQueryLength, country, maxResults, debounceMs]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
    
    // Clear timeout and abort request
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    suggestions,
    loading,
    error,
    searchAddresses,
    clearSuggestions,
  };
};
