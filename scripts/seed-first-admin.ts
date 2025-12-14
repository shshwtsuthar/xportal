import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from custom file if specified
const envFile = process.env.ENV_FILE || '.env.local';
dotenv.config({ path: envFile });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.XPORTAL_EMAIL;
const ADMIN_PASSWORD = process.env.XPORTAL_PASSWORD;
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Admin';
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'User';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    'Missing required environment variables: ADMIN_EMAIL or ADMIN_PASSWORD'
  );
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Ensures a profile record exists for the given user.
 * Creates it if it doesn't exist (idempotent).
 */
async function ensureProfileExists(
  userId: string,
  rtoId: string,
  role: string,
  firstName: string,
  lastName: string
) {
  // Check if profile already exists
  const { data: existingProfile, error: checkError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 is "not found" error, which is expected if profile doesn't exist
    throw checkError;
  }

  if (existingProfile) {
    console.log('Profile already exists for user:', userId);
    return;
  }

  // Create the profile
  const { error: insertError } = await supabase.from('profiles').insert({
    id: userId,
    rto_id: rtoId,
    role: role as
      | 'ADMISSIONS_OFFICER'
      | 'SENIOR_ADMISSIONS_OFFICER'
      | 'COMPLIANCE_MANAGER'
      | 'ACADEMIC_HEAD'
      | 'FINANCE_OFFICER'
      | 'ADMIN',
    first_name: firstName,
    last_name: lastName,
  });

  if (insertError) throw insertError;
  console.log('Successfully created profile for user:', userId);
}

async function seedFirstAdmin() {
  try {
    console.log(`Using environment file: ${envFile}`);
    console.log(`Seeding admin: ${ADMIN_EMAIL}`);

    // Ensure initial RTO exists (idempotent)
    const { error: seedErr } = await supabase.rpc('seed_initial_data');
    if (seedErr) throw seedErr;

    // Check if any RTOs exist
    const { data: existingRTOs, error: rtoError } = await supabase
      .from('rtos')
      .select('id, name, rto_code')
      .limit(1);

    if (rtoError) throw rtoError;

    if (existingRTOs && existingRTOs.length > 0) {
      console.log('Found existing RTO:', existingRTOs[0]);

      // Check if admin user exists
      const { data: adminUser, error: adminError } =
        await supabase.auth.admin.listUsers();

      if (adminError) throw adminError;

      const adminUserData = adminUser.users.find(
        (user) =>
          user.email === ADMIN_EMAIL && user.app_metadata?.role === 'ADMIN'
      );

      if (adminUserData) {
        console.log('Admin user already exists. Checking profile...');
        // Ensure profile exists even if user already exists
        const rtoId = existingRTOs[0].id;
        await ensureProfileExists(
          adminUserData.id,
          rtoId,
          'ADMIN',
          adminUserData.user_metadata?.first_name || ADMIN_FIRST_NAME,
          adminUserData.user_metadata?.last_name || ADMIN_LAST_NAME
        );
        console.log('Seed process complete.');
        process.exit(0);
      } else {
        console.log('Creating admin user for existing RTO...');
        const rtoId = existingRTOs[0].id;
        // Continue with creating admin user only
        const { data: user, error: createUserError } =
          await supabase.auth.admin.createUser({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            email_confirm: true,
            user_metadata: {
              first_name: ADMIN_FIRST_NAME,
              last_name: ADMIN_LAST_NAME,
            },
            app_metadata: {
              rto_id: rtoId,
              role: 'ADMIN',
            },
          });

        if (createUserError) throw createUserError;
        if (!user) throw new Error('Failed to create admin user');

        console.log('Successfully created admin user:', user.user.email);

        // Ensure profile exists (trigger might not fire with admin.createUser)
        await ensureProfileExists(
          user.user.id,
          rtoId,
          'ADMIN',
          ADMIN_FIRST_NAME,
          ADMIN_LAST_NAME
        );

        console.log('Seed process complete.');
        process.exit(0);
      }
    }

    // If no RTOs found, seed_initial_data should have created one
    const { data: rto, error: rtoFetchErr } = await supabase
      .from('rtos')
      .select('id, name')
      .limit(1)
      .single();

    if (rtoFetchErr) throw rtoFetchErr;
    if (!rto) throw new Error('No RTO found after seed_initial_data');
    console.log('Using RTO:', rto.id);

    // Create the admin user
    const { data: user, error: createUserError } =
      await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
          first_name: ADMIN_FIRST_NAME,
          last_name: ADMIN_LAST_NAME,
        },
        app_metadata: {
          rto_id: rto.id,
          role: 'ADMIN',
        },
      });

    if (createUserError) throw createUserError;
    if (!user) throw new Error('Failed to create admin user');

    console.log('Successfully created admin user:', user.user.email);

    // Ensure profile exists (trigger might not fire with admin.createUser)
    await ensureProfileExists(
      user.user.id,
      rto.id,
      'ADMIN',
      ADMIN_FIRST_NAME,
      ADMIN_LAST_NAME
    );

    console.log('You can now log in with these credentials.');
  } catch (error) {
    console.error('Error seeding first admin:', error);
    process.exit(1);
  }
}

// Run the seed function
seedFirstAdmin();
