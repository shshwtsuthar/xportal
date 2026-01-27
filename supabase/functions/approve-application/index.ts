/// <reference lib="deno.ns" />

import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../_shared/database.types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type Db = Database;

// Type for the approval request body
interface ApprovalRequest {
  applicationId: string;
  newGroupId?: string | null;
}

// Type for the atomic approval result
interface ApprovalResult {
  student_id: string;
  enrollment_id: string;
  student_email: string;
  student_first_name: string;
  student_last_name: string;
  student_preferred_name: string | null;
  student_id_display: string;
  rto_id: string;
  was_new_student: boolean;
  was_new_enrollment: boolean;
}

// ==================== Helper Functions (DRY Principle) ====================

/**
 * Creates a standardized error response
 */
function errorResponse(message: string, status: number, details?: string) {
  return new Response(JSON.stringify({ error: message, details }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

/**
 * Creates a standardized success response
 */
function successResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

/**
 * Recursively lists all files in a storage bucket folder
 */
async function listFilesRecursively(
  storage: ReturnType<typeof createClient>['storage'],
  bucket: string,
  prefix: string,
  files: string[] = []
): Promise<string[]> {
  const { data, error } = await storage.from(bucket).list(prefix, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error) {
    console.error(`Error listing files in ${prefix}:`, error);
    return files;
  }

  if (!data || data.length === 0) {
    return files;
  }

  for (const item of data) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id) {
      // It's a file
      files.push(fullPath);
    } else {
      // It's a folder, recurse into it
      await listFilesRecursively(storage, bucket, fullPath, files);
    }
  }

  return files;
}

/**
 * Copies files from application bucket to student bucket
 * Returns array of warnings (non-blocking operation)
 */
async function copyApplicationFilesToStudent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: any,
  applicationId: string,
  studentId: string
): Promise<string[]> {
  const warnings: string[] = [];

  try {
    const applicationFiles = await listFilesRecursively(
      service.storage,
      'applications',
      applicationId
    );

    for (const filePath of applicationFiles) {
      try {
        // Download from applications bucket
        const { data: fileData, error: downloadErr } = await service.storage
          .from('applications')
          .download(filePath);

        if (downloadErr || !fileData) {
          warnings.push(
            `Failed to download ${filePath}: ${downloadErr?.message || 'Unknown error'}`
          );
          continue;
        }

        // Calculate relative path (remove applicationId prefix)
        const relativePath = filePath.startsWith(`${applicationId}/`)
          ? filePath.slice(`${applicationId}/`.length)
          : filePath;

        // Upload to students bucket
        const targetPath = `${studentId}/${relativePath}`;
        const contentType = fileData.type || undefined;
        const { error: uploadErr } = await service.storage
          .from('students')
          .upload(targetPath, fileData, {
            contentType,
            upsert: false,
          });

        if (uploadErr) {
          warnings.push(`Failed to upload ${targetPath}: ${uploadErr.message}`);
        }
      } catch (fileErr) {
        warnings.push(
          `Error copying ${filePath}: ${fileErr instanceof Error ? fileErr.message : String(fileErr)}`
        );
      }
    }
  } catch (copyErr) {
    console.error('Error during file copy:', copyErr);
    warnings.push(
      `File copy operation failed: ${copyErr instanceof Error ? copyErr.message : String(copyErr)}`
    );
  }

  return warnings;
}

/**
 * Creates Supabase auth user for the student
 * Returns { userId, inviteLink, warnings }
 */
async function createStudentAuthUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: any,
  student: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    preferred_name: string | null;
  },
  rtoId: string
): Promise<{
  userId: string | null;
  inviteLink: string | null;
  warnings: string[];
}> {
  const warnings: string[] = [];

  if (!student.email) {
    console.warn(`Student ${student.id} has no email, skipping user creation`);
    warnings.push('Student has no email - auth user not created');
    return { userId: null, inviteLink: null, warnings };
  }

  try {
    const siteUrl =
      Deno.env.get('SITE_URL') ||
      Deno.env.get('NEXT_PUBLIC_SITE_URL') ||
      'http://127.0.0.1:3000';

    const { data: linkData, error: linkErr } =
      await service.auth.admin.generateLink({
        type: 'invite',
        email: student.email,
        options: {
          data: {
            first_name: student.first_name,
            last_name: student.last_name,
            rto_id: rtoId,
            role: 'STUDENT',
            student_id: student.id,
          },
          redirectTo: `${siteUrl}/auth/callback?next=/auth/update-password`,
        },
      });

    if (linkErr || !linkData?.properties?.action_link) {
      console.error('Failed to generate invite link:', linkErr);
      warnings.push(
        `Failed to generate invite link: ${linkErr?.message || 'Unknown error'}`
      );
      return { userId: null, inviteLink: null, warnings };
    }

    const authUserId = linkData.user?.id;
    if (!authUserId) {
      warnings.push('No user ID returned from auth link generation');
      return {
        userId: null,
        inviteLink: linkData.properties.action_link,
        warnings,
      };
    }

    // Update user metadata and app_metadata
    await service.auth.admin.updateUserById(authUserId, {
      user_metadata: {
        first_name: student.first_name,
        last_name: student.last_name,
        preferred_name: student.preferred_name,
      },
      app_metadata: {
        rto_id: rtoId,
        role: 'STUDENT',
        student_id: student.id,
      },
    });

    // Link user_id to student record
    const { error: updateErr } = await service
      .from('students')
      .update({ user_id: authUserId })
      .eq('id', student.id);

    if (updateErr) {
      console.error('Failed to link user_id to student:', updateErr);
      warnings.push(`Failed to link user account: ${updateErr.message}`);
    }

    return {
      userId: authUserId,
      inviteLink: linkData.properties.action_link,
      warnings,
    };
  } catch (userErr) {
    console.error('Error creating user:', userErr);
    warnings.push(
      `User creation error: ${userErr instanceof Error ? userErr.message : String(userErr)}`
    );
    return { userId: null, inviteLink: null, warnings };
  }
}

/**
 * Sends acceptance email to student via Resend
 * Returns array of warnings (non-blocking operation)
 */
async function sendAcceptanceEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  student: {
    id: string;
    email: string;
    first_name: string;
    preferred_name: string | null;
    student_id_display: string;
  },
  rtoId: string,
  inviteLink: string
): Promise<string[]> {
  const warnings: string[] = [];

  if (!student.email) {
    warnings.push('Student has no email - acceptance email not sent');
    return warnings;
  }

  try {
    // Fetch RTO name
    const { data: rtoInfo } = await supabase
      .from('rtos')
      .select('name')
      .eq('id', rtoId)
      .single();

    const rtoName = rtoInfo?.name || 'your training organisation';
    const studentName =
      student.preferred_name || student.first_name || 'Student';

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const resendFrom = Deno.env.get('RESEND_FROM');

    if (!resendKey) {
      console.warn('RESEND_API_KEY not found - skipping acceptance email');
      warnings.push('Acceptance email not sent (Resend not configured)');
      return warnings;
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFrom ?? 'no-reply@example.com',
        to: student.email,
        subject: `Welcome to ${rtoName} - Your Application Has Been Approved`,
        html: `
          <p>Dear ${studentName},</p>
          <p>Congratulations! Your application has been approved and you have been accepted to ${rtoName}.</p>
          <p>A new user account has been created for you. Please click the button below to set your password and access your student portal.</p>
          <p><a href="${inviteLink}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Set Password & Access Portal</a></p>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p><a href="${inviteLink}">${inviteLink}</a></p>
          <p>Your Student ID: <strong>${student.student_id_display}</strong></p>
          <p>Once you've set your password, you'll be able to:</p>
          <ul>
            <li>View your course progression</li>
            <li>Access your assignments</li>
            <li>View your finance and attendance records</li>
          </ul>
          <p>If you have any questions, please contact ${rtoName}.</p>
          <p>— ${rtoName} Team</p>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errorText = await emailRes.text();
      console.warn(`Email send failed for student ${student.id}:`, errorText);
      warnings.push(`Failed to send acceptance email: ${errorText}`);
    }
  } catch (emailErr) {
    console.error('Error sending email:', emailErr);
    warnings.push(
      `Email send error: ${emailErr instanceof Error ? emailErr.message : String(emailErr)}`
    );
  }

  return warnings;
}

/**
 * Syncs student to Xero as a contact (non-blocking, fire-and-forget)
 */
function syncStudentToXero(studentId: string): void {
  try {
    const xeroSyncUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/xero-sync-contact`;
    fetch(xeroSyncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({ studentId }),
    }).catch((err) => {
      console.warn('Xero contact sync failed (non-blocking):', err);
    });
  } catch (xeroErr) {
    console.warn('Xero contact sync error (non-blocking):', xeroErr);
  }
}

// ==================== Main Request Handler ====================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient<Db>(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  );

  // Service role client for privileged operations
  const service = createClient<Db>(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { applicationId, newGroupId } = (await req.json()) as ApprovalRequest;

    if (!applicationId) {
      return errorResponse('applicationId is required', 400);
    }

    console.log(`Starting approval process for application ${applicationId}`);

    // ==================== Phase 1: Atomic Database Operations ====================
    // All database operations are now atomic - they either all succeed or all fail
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: approvalResultRaw, error: approvalErr } = await (
      supabase as any
    ).rpc('approve_application_atomic', {
      p_application_id: applicationId,
      p_new_group_id: newGroupId || null,
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (approvalErr) {
      console.error('Atomic approval failed:', approvalErr);
      return errorResponse(
        'Failed to approve application',
        500,
        approvalErr.message
      );
    }

    if (!approvalResultRaw) {
      return errorResponse('Approval returned no result', 500);
    }

    // Cast to proper type
    const approvalResult = approvalResultRaw as ApprovalResult;
    console.log('Atomic approval completed:', approvalResult);

    const studentId = approvalResult.student_id;
    const enrollmentId = approvalResult.enrollment_id;
    const studentEmail = approvalResult.student_email;
    const studentFirstName = approvalResult.student_first_name;
    const studentLastName = approvalResult.student_last_name;
    const studentPreferredName = approvalResult.student_preferred_name;
    const studentIdDisplay = approvalResult.student_id_display;
    const rtoId = approvalResult.rto_id;

    const warnings: string[] = [];

    // ==================== Phase 2: Post-Transaction Operations ====================
    // These operations are idempotent and non-blocking
    // They run AFTER the atomic transaction succeeds

    // 2a) Copy application files to student bucket (non-blocking)
    console.log(`Copying files for student ${studentId}`);
    const fileCopyWarnings = await copyApplicationFilesToStudent(
      service,
      applicationId,
      studentId
    );
    warnings.push(...fileCopyWarnings);

    // 2b) Create Supabase auth user (non-blocking but important)
    console.log(`Creating auth user for student ${studentId}`);
    const {
      userId,
      inviteLink,
      warnings: authWarnings,
    } = await createStudentAuthUser(
      service,
      {
        id: studentId,
        email: studentEmail,
        first_name: studentFirstName,
        last_name: studentLastName,
        preferred_name: studentPreferredName,
      },
      rtoId
    );
    warnings.push(...authWarnings);

    // 2c) Send acceptance email (non-blocking)
    if (inviteLink) {
      console.log(`Sending acceptance email to ${studentEmail}`);
      const emailWarnings = await sendAcceptanceEmail(
        supabase,
        {
          id: studentId,
          email: studentEmail,
          first_name: studentFirstName,
          preferred_name: studentPreferredName,
          student_id_display: studentIdDisplay,
        },
        rtoId,
        inviteLink
      );
      warnings.push(...emailWarnings);
    } else {
      warnings.push('No invite link available - acceptance email not sent');
    }

    // 2d) Sync to Xero (fire-and-forget, completely non-blocking)
    console.log(`Initiating Xero sync for student ${studentId}`);
    syncStudentToXero(studentId);

    // ==================== Return Success Response ====================
    console.log(`Approval process completed for application ${applicationId}`);

    return successResponse({
      message: 'Application approved, invoices scheduled for issue',
      studentId,
      enrollmentId,
      userId,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (err) {
    console.error('Unexpected error in approval process:', err);
    return errorResponse(
      'Internal server error',
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
});
