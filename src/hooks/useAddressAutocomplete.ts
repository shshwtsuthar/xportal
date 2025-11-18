import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

const AUTOCOMPLETE_URL = 'https://mappify.io/api/rpc/address/autocomplete';
const MIN_QUERY_LENGTH = 3;

type SortOrigin = {
  lat: number;
  lon: number;
};

type RawMappifyAddress = {
  buildingName: string | null;
  flatNumberPrefix: string | null;
  flatNumber: number | null;
  flatNumberSuffix: string | null;
  levelNumber: number | null;
  numberFirst: number | null;
  numberLast: number | null;
  streetName: string | null;
  streetType: string | null;
  streetSuffixCode: string | null;
  suburb: string | null;
  state: string | null;
  postCode: string | null;
  streetAddress: string | null;
  location?: {
    lat: number;
    lon: number;
  };
  primary?: boolean;
  jurisdictionId?: string | null;
  gnafId?: string | null;
  confidence?: number;
};

export type AddressFormFields = {
  street_building_name: string;
  street_unit_details: string;
  street_number_name: string;
  street_po_box: string;
  suburb: string;
  state: string;
  postcode: string;
  street_country: string;
};

export type AddressSuggestion = {
  id: string;
  label: string;
  subLabel: string;
  confidence: number;
  location?: { lat: number; lon: number };
  fields: AddressFormFields;
  raw: RawMappifyAddress;
};

type UseAddressAutocompleteArgs = {
  query: string;
  sortOrigin?: SortOrigin;
  debounceMs?: number;
  includeInternalIdentifiers?: boolean;
  enabled?: boolean;
};

type AutocompleteResponse = {
  type: string;
  result: RawMappifyAddress[];
  confidence?: number;
};

type AutocompleteQueryResult = {
  result: RawMappifyAddress[];
  confidence?: number;
};

/**
 * Small client-side debouncer for primitive values.
 */
const useDebouncedValue = <T>(value: T, delayMs: number) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
};

const buildId = (address: RawMappifyAddress, index: number) => {
  return (
    address.gnafId ||
    address.jurisdictionId ||
    [address.streetAddress, address.suburb, address.state, index].join('-')
  );
};

const buildStreetNumberName = (address: RawMappifyAddress) => {
  const hasRange =
    address.numberFirst &&
    address.numberLast &&
    address.numberLast !== address.numberFirst;
  const numberPart = hasRange
    ? `${address.numberFirst}-${address.numberLast}`
    : (address.numberFirst?.toString() ?? '');
  const streetParts = [
    address.streetName,
    address.streetType,
    address.streetSuffixCode,
  ]
    .map((part) => formatTitleCase(part))
    .filter(Boolean)
    .join(' ')
    .trim();

  return [numberPart, streetParts].filter(Boolean).join(' ').trim();
};

/**
 * Normalizes casing to Title Case for improved readability.
 */
const formatTitleCase = (value?: string | null) => {
  if (!value) {
    return '';
  }
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(' ');
};

const buildUnitDetails = (address: RawMappifyAddress) => {
  const unitParts = [
    address.flatNumberPrefix,
    address.flatNumber,
    address.flatNumberSuffix,
    address.levelNumber ? `Level ${address.levelNumber}` : null,
  ].filter(Boolean);
  return unitParts.join(' ').trim();
};

const toSuggestion = (
  address: RawMappifyAddress,
  index: number
): AddressSuggestion => {
  const label = address.streetAddress ?? buildStreetNumberName(address);
  const subLabel = [address.suburb, address.state, address.postCode]
    .filter(Boolean)
    .join(' • ');

  const fields: AddressFormFields = {
    street_building_name: address.buildingName ?? '',
    street_unit_details: buildUnitDetails(address),
    street_number_name: buildStreetNumberName(address),
    street_po_box: '',
    suburb: formatTitleCase(address.suburb),
    state: address.state ?? '',
    postcode: address.postCode ?? '',
    street_country: 'AU',
  };

  return {
    id: buildId(address, index),
    label,
    subLabel,
    confidence:
      typeof address.primary === 'boolean' ? (address.primary ? 1 : 0) : 0,
    location: address.location,
    fields,
    raw: address,
  };
};

/**
 * Fetches address suggestions from Mappify's autocomplete endpoint and returns
 * normalized records ready to hydrate application form fields.
 *
 * @param args.query Raw user input string to autocomplete
 * @param args.sortOrigin Optional lat/lon used by Mappify for sorting
 * @param args.enabled Allows callers to toggle the query (defaults to true)
 * @returns TanStack Query result with normalized address suggestions
 */
export const useAddressAutocomplete = ({
  query,
  sortOrigin,
  debounceMs = 300,
  includeInternalIdentifiers = false,
  enabled = true,
}: UseAddressAutocompleteArgs) => {
  const apiKey = process.env.NEXT_PUBLIC_MAPPIFY_API_KEY;
  const debouncedQuery = useDebouncedValue(query, debounceMs);

  const shouldQuery =
    enabled && debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  const result = useQuery<AutocompleteQueryResult>({
    queryKey: [
      'addressAutocomplete',
      debouncedQuery,
      sortOrigin?.lat ?? null,
      sortOrigin?.lon ?? null,
      includeInternalIdentifiers,
    ],
    enabled: shouldQuery,
    queryFn: async () => {
      const payload: Record<string, unknown> = {
        streetAddress: debouncedQuery,
        formatCase: true,
        includeInternalIdentifiers,
      };

      if (apiKey) {
        payload.apiKey = apiKey;
      }
      if (sortOrigin) {
        payload.sortOrigin = sortOrigin;
      }

      const response = await fetch(AUTOCOMPLETE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Mappify autocomplete failed: ${response.status} ${text}`
        );
      }

      const json = (await response.json()) as AutocompleteResponse;
      return {
        result: Array.isArray(json.result) ? json.result : [],
        confidence:
          typeof json.confidence === 'number' ? json.confidence : undefined,
      };
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const suggestions = useMemo(() => {
    if (!result.data) {
      return [];
    }
    return result.data.result.map((address, index) => {
      const suggestion = toSuggestion(address, index);
      return {
        ...suggestion,
        confidence:
          typeof address.confidence === 'number'
            ? address.confidence
            : (result.data?.confidence ?? 0),
      };
    });
  }, [result.data]);

  return {
    ...result,
    suggestions,
    isIdle: !shouldQuery,
  };
};
