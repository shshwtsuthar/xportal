'use client';

import { StudentDashboardPageClient } from '../_components/StudentDashboardPageClient';

type PageProps = { params: Promise<{ id: string }> };

/**
 * Staff-facing student detail page.
 * Displays full student information with all staff controls enabled.
 */
export default function StudentPage({ params }: PageProps) {
  return <StudentDashboardPageClient params={params} mode="staff" />;
}
