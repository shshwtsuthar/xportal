import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seedFirstAdmin() {
  try {
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

      const hasAdmin = adminUser.users.some(
        (user) =>
          user.email === 'shshwtsuthar@gmail.com' &&
          user.app_metadata?.role === 'ADMIN'
      );

      if (hasAdmin) {
        console.log('Admin user already exists. Skipping seed process.');
        process.exit(0);
      } else {
        console.log('Creating admin user for existing RTO...');
        const rtoId = existingRTOs[0].id;
        // Continue with creating admin user only
        const { data: user, error: createUserError } =
          await supabase.auth.admin.createUser({
            email: process.env.XPORTAL_EMAIL,
            password: process.env.XPORTAL_PASSWORD,
            email_confirm: true,
            user_metadata: {
              first_name: 'Shashwat',
              last_name: 'Suthar',
            },
            app_metadata: {
              rto_id: rtoId,
              role: 'ADMIN',
            },
          });

        if (createUserError) throw createUserError;
        console.log('Successfully created admin user:', user.user.email);
        process.exit(0);
      }
    }

    // Create the first RTO
    const { data: rto, error: createRTOError } = await supabase
      .from('rtos')
      .insert({
        name: 'Ashford College',
        rto_code: '46296',
        address_line_1: 'Level 3/65 Brougham Street',
        suburb: 'Geelong',
        state: 'VIC',
        postcode: '3220',
        type_identifier: 'RTO',
        phone_number: '+61 2 1234 5678',
        email_address: 'admin@ashford.edu.au',
        contact_name: 'Admin',
      })
      .select()
      .single();

    if (createRTOError) throw createRTOError;
    if (!rto) throw new Error('Failed to create RTO');

    console.log('Created RTO:', rto.id);

    // Create the admin user
    const { data: user, error: createUserError } =
      await supabase.auth.admin.createUser({
        email: 'shshwtsuthar@gmail.com',
        password: '$ha$hw1T$uthar',
        email_confirm: true,
        user_metadata: {
          first_name: 'Shashwat',
          last_name: 'Suthar',
        },
        app_metadata: {
          rto_id: rto.id,
          role: 'ADMIN',
        },
      });

    if (createUserError) throw createUserError;
    if (!user) throw new Error('Failed to create admin user');

    console.log('Successfully created admin user:', user.user.email);
    console.log('You can now log in with these credentials.');
  } catch (error) {
    console.error('Error seeding first admin:', error);
    process.exit(1);
  }
}

// Run the seed function
seedFirstAdmin();
