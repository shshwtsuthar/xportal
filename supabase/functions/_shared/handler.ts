// =============================================================================
// FILE:        handler.ts (v2 - Hardened Error Handling)
// PROJECT:     XPortal Student Management System (SMS)
// AUTHOR:      Lead Backend Engineer
//
// DESCRIPTION:
// This is the master API route handler for all Edge Functions.
//
// This version is hardened to specifically handle Zod validation errors.
// It catches raw ZodError exceptions and transforms them into our standard
// ValidationError, ensuring that the client always receives a structured,
// actionable 400 Bad Request instead of a generic 500 Internal Server Error.
// =============================================================================

import { ApiError, ValidationError } from './errors.ts';
import type { User } from 'https://esm.sh/@supabase/supabase-js@2';
import { ZodError } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

export interface ApiContext { user?: Partial<User>; userRoles?: string[]; }
export type ApiLogicHandler = (req: Request, ctx: ApiContext, body: unknown) => Promise<Response>;

export const createApiRoute = (logic: ApiLogicHandler) => {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }
    try {
      // In a real scenario, this context would be populated by an auth middleware
      const apiContext: ApiContext = {};
      console.warn("WARNING: Authentication is currently bypassed for development.");
      
      const body = req.headers.get('content-type')?.includes('application/json') ? await req.json() : null;
      return await logic(req, apiContext, body);
    } catch (err) {
      console.error(`[API_ERROR]`, err);

      // CRITICAL FIX: Add specific handling for ZodError
      if (err instanceof ZodError) {
        const validationError = new ValidationError(
          "Payload validation failed. Please review the highlighted fields.",
          err.flatten().fieldErrors
        );
        return new Response(
          JSON.stringify({ message: validationError.message, errors: validationError.details }),
          { status: validationError.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const status = err instanceof ApiError ? err.status : 500;
      const message = err instanceof ApiError ? err.message : 'An internal server error occurred.';
      
      const responseBody = err instanceof ValidationError
        ? JSON.stringify({ message, errors: err.details })
        : JSON.stringify({ message });

      return new Response(responseBody, { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  };
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, if-match',
  'Access-Control-Expose-Headers': 'etag',
};