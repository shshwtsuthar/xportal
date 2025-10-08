'use client';

import { useParams } from 'next/navigation';
import { ProgramPlanWizard } from '../../_components/ProgramPlanWizard';
import { useGetProgramPlans } from '@/src/hooks/useGetProgramPlans';
import { Tables } from '@/database.types';
import { useMemo } from 'react';

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
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Program Plan Not Found
          </h1>
          <p className="text-muted-foreground text-sm">
            The requested program plan could not be found.
          </p>
        </div>
      </div>
    );
  }

  return <ProgramPlanWizard plan={plan} />;
}
