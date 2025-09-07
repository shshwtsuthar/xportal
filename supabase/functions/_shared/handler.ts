import { ApiError, ValidationError } from './errors.ts';

export interface ApiContext { user?: any; userRoles?: string[]; }
export type ApiLogicHandler = (req: Request, ctx: ApiContext, body: unknown) => Promise<Response>;

export const createApiRoute = (logic: ApiLogicHandler) => {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') { 
      return new Response('ok', { 
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, if-match, idempotency-key',
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
        }
      }); 
    }
    
    try {
      const apiContext: ApiContext = {};
      let body = null;
      
      // Only try to parse JSON if there's a content-type header and it's JSON
      const contentType = req.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          body = await req.json();
        } catch (jsonErr) {
          // If JSON parsing fails, continue with null body
          console.warn('[API_WARNING] Failed to parse JSON body:', jsonErr);
          body = null;
        }
      }
      
      return await logic(req, apiContext, body);
    } catch (err) {
      console.error(`[API_ERROR]`, err);
      
      // Handle specific error types
      if (err instanceof ApiError) {
        return new Response(
          JSON.stringify({ message: err.message, ...(err instanceof ValidationError && err.details ? { details: err.details } : {}) }),
          { status: err.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ message: 'An internal server error occurred.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  };
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, if-match, idempotency-key',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
  'Access-Control-Expose-Headers': 'etag',
};