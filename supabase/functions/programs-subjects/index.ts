// =============================================================================
// FILE:        programs-subjects/index.ts
// PROJECT:     XPortal Student Management System (SMS)
// AUTHOR:      Lead Backend Engineer
//
// DESCRIPTION:
// This endpoint serves the academic structure of a single program. It is a
// critical read-only endpoint required by the enrolment wizard to display
// core and elective units of competency.
// =============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createApiRoute, corsHeaders, type ApiContext } from '../_shared/handler.ts';
import { db } from '../_shared/db.ts';
import { NotFoundError } from '../_shared/errors.ts';

const programsSubjectsRouter = async (req: Request, _ctx: ApiContext, _body: unknown): Promise<Response> => {
  if (req.method !== 'GET') {
    throw new NotFoundError();
  }

  const url = new URL(req.url);
  // Expects a URL structure like: .../programs/{programId}/subjects
  const pathSegments = url.pathname.split('/').filter(Boolean);
  if (pathSegments.length !== 3 || pathSegments[0] !== 'programs' || pathSegments[2] !== 'subjects') {
    throw new NotFoundError('Invalid endpoint structure. Expected /programs/{programId}/subjects');
  }
  const programId = pathSegments[1];

  // This single, efficient query joins the program structure with the subject details.
  const subjects = await db.selectFrom('core.program_subjects as ps')
    .innerJoin('core.subjects as s', 'ps.subject_id', 's.id')
    .where('ps.program_id', '=', programId)
    .select([
      's.id as subject_id',
      's.subject_identifier',
      's.subject_name',
      'ps.unit_type'
    ])
    .orderBy('ps.unit_type', 'asc') // Group Core units together
    .orderBy('s.subject_name', 'asc')
    .execute();

  return new Response(JSON.stringify(subjects), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

const handler = createApiRoute(programsSubjectsRouter);
serve(handler);