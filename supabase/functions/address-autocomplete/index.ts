// =============================================================================
// SUPABASE EDGE FUNCTION: Address Autocomplete
// Purpose: Provides address autocomplete functionality using Addressable API
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createApiRoute, corsHeaders } from '../_shared/handler.ts';
// Local mapping function (since we can't import from frontend lib)
const STATE_MAPPING: Record<string, string> = {
  'Victoria': 'VIC',
  'New South Wales': 'NSW',
  'Queensland': 'QLD',
  'South Australia': 'SA',
  'Western Australia': 'WA',
  'Tasmania': 'TAS',
  'Northern Territory': 'NT',
  'Australian Capital Territory': 'ACT',
  // Handle variations
  'NSW': 'NSW',
  'VIC': 'VIC',
  'QLD': 'QLD',
  'SA': 'SA',
  'WA': 'WA',
  'TAS': 'TAS',
  'NT': 'NT',
  'ACT': 'ACT',
};

function mapStateToCode(stateName: string): string {
  const mapped = STATE_MAPPING[stateName];
  if (!mapped) {
    console.warn(`Unknown state name: ${stateName}`);
    return stateName; // Return original if not found
  }
  return mapped;
}

function mapAddressableResponse(address: AddressableApiResponse): AddressableAddress {
  // Check if it's AU format (has building_name and unit_details)
  const isAU = 'building_name' in address;
  
  if (isAU) {
    return {
      streetNumber: address.street_number,
      streetName: address.street,
      unitDetails: address.unit_details || undefined,
      buildingName: address.building_name || undefined,
      suburb: address.locality,
      state: mapStateToCode(address.region),
      postcode: address.postcode,
      formatted: address.formatted,
    };
  } else {
    return {
      streetNumber: address.street_number,
      streetName: address.street,
      suburb: address.locality,
      state: mapStateToCode(address.region),
      postcode: address.postcode,
      formatted: address.formatted,
    };
  }
}

// Types from generated API types
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

interface AddressableApiResponse {
  building_name?: string | null;
  unit_details?: string | null;
  street_number: string;
  street: string;
  locality: string;
  region: string;
  postcode: string;
  meshblock: string;
  lon: string;
  lat: string;
  formatted: string;
}

const addressAutocompleteLogic = async (req: Request, ctx: any, body: unknown): Promise<Response> => {
  try {

    // Parse query parameters
    const url = new URL(req.url);
    const query = url.searchParams.get('query');
    const country = url.searchParams.get('country') || 'AU';
    const maxResults = parseInt(url.searchParams.get('maxResults') || '5');

    // Validate required parameters
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!['AU', 'NZ'].includes(country)) {
      return new Response(
        JSON.stringify({ error: 'Country must be AU or NZ' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (maxResults < 1 || maxResults > 10) {
      return new Response(
        JSON.stringify({ error: 'maxResults must be between 1 and 10' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get Addressable API key from environment
    const addressableApiKey = Deno.env.get('ADDRESSABLE_API_KEY');
    if (!addressableApiKey) {
      return new Response(
        JSON.stringify({ error: 'Addressable API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Call Addressable API
    const addressableUrl = new URL('https://api.addressable.dev/v2/autocomplete');
    addressableUrl.searchParams.set('api_key', addressableApiKey);
    addressableUrl.searchParams.set('country_code', country);
    addressableUrl.searchParams.set('q', query);
    addressableUrl.searchParams.set('max_results', maxResults.toString());

    const addressableResponse = await fetch(addressableUrl.toString());
    
    if (!addressableResponse.ok) {
      const errorText = await addressableResponse.text();
      console.error('Addressable API error:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Address lookup failed',
          details: addressableResponse.status === 401 ? 'Invalid API key' : 'Service unavailable'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const addressableData: AddressableApiResponse[] = await addressableResponse.json();

    // Map the response to our internal format
    const mappedAddresses: AddressableAddress[] = addressableData.map(address => 
      mapAddressableResponse(address)
    );

    return new Response(
      JSON.stringify(mappedAddresses),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Address autocomplete error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

const handler = createApiRoute(addressAutocompleteLogic);
serve(handler);
