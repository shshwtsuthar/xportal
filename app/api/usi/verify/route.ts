import { NextResponse } from 'next/server';
import { verifyUSI } from '@/lib/utils/usiValidator';

export const runtime = 'nodejs';

/**
 * POST /api/usi/verify
 * Validates a USI format locally before attempting SOAP API call.
 *
 * This endpoint performs local validation to prevent sending malformed USIs
 * to the Australian Government USI Registry API (SOAP-based, rate-limited).
 *
 * TODO: After local validation passes, integrate SOAP call to:
 * - VerifyUSI (check if USI exists in registry)
 * - CreateUSI (create new USI if needed)
 *
 * @param request - Request body: { usi: string }
 * @returns { valid: boolean, message?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { usi } = body;

    if (!usi || typeof usi !== 'string') {
      return NextResponse.json(
        { error: 'USI is required and must be a string' },
        { status: 400 }
      );
    }

    // Local format validation using Luhn Mod N checksum
    if (!verifyUSI(usi)) {
      return NextResponse.json(
        { error: 'Invalid USI Checksum', valid: false },
        { status: 400 }
      );
    }

    // TODO: Integrate SOAP API call here
    // Example structure:
    // const soapResponse = await callUSIRegistryAPI('VerifyUSI', { usi });
    // return NextResponse.json({ valid: true, verified: soapResponse.exists });

    // Placeholder response for now
    return NextResponse.json(
      {
        valid: true,
        message: 'USI format is valid. SOAP integration pending.',
      },
      { status: 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: msg || 'Unexpected error' },
      { status: 500 }
    );
  }
}
