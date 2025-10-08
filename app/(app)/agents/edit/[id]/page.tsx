'use client';

import { use } from 'react';
import { NewAgentWizard } from '../../_components/NewAgentWizard';

export default function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <NewAgentWizard agentId={id} />;
}
