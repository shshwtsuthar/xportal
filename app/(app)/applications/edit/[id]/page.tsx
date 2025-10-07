'use client';

import { useParams } from 'next/navigation';
import { NewApplicationWizard } from '../../_components/NewApplicationWizard';

export default function EditApplicationPage() {
  const params = useParams<{ id: string }>();
  const applicationId = params?.id as string;

  return <NewApplicationWizard applicationId={applicationId} />;
}
