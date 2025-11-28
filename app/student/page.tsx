import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StudentDashboardPageClient } from '@/app/(app)/students/_components/StudentDashboardPageClient';

export default async function StudentPortalPage() {
  const supabase = await createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    redirect('/login');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.id) {
    redirect('/login');
  }

  // Query student by user_id (1:1 link)
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (studentError) {
    throw new Error('Failed to load student record for current user.');
  }

  if (!student) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome!</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          No student record is linked to this account yet. Please contact your
          training organisation for assistance.
        </p>
      </div>
    );
  }

  const welcomeName =
    student.preferred_name && student.preferred_name.trim().length > 0
      ? student.preferred_name
      : student.first_name;

  return (
    <StudentDashboardPageClient
      studentIdDisplay={student.student_id_display}
      mode="student"
      welcomeNameOverride={welcomeName}
    />
  );
}
