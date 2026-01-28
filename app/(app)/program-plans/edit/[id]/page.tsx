'use client';

import { useParams } from 'next/navigation';
import { ProgramPlanWizard } from '../../_components/ProgramPlanWizard';
import { useGetProgramPlans } from '@/src/hooks/useGetProgramPlans';
import { Tables } from '@/database.types';
import { useMemo } from 'react';
import { PageContainer } from '@/components/page-container';

export default function EditProgramPlanPage() {
  const params = useParams();
  const id = params?.id as string;

  // Fetch all plans and find the one we need
  const { data: plans = [], isLoading } = useGetProgramPlans();

  const plan = useMemo(() => {
    if (!id || !plans.length) return undefined;
    return plans.find((p) => p.id === id) as
      | Tables<'program_plans'>
      | undefined;
  }, [id, plans]);

  if (isLoading) {
    return <PageContainer title="Loading..." />;
  }

  if (!plan) {
    return (
      <PageContainer
        title="Program Plan Not Found"
        description="The requested program plan could not be found."
      />
    );
  }

  return <ProgramPlanWizard plan={plan} />;
}
