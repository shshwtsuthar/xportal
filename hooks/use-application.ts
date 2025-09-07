import { useState, useEffect, useCallback } from 'react';
import { applicationStateManager } from '@/lib/application-state';
import type { components } from '../supabase/functions/_shared/api.types';

type Application = components["schemas"]["Application"];
type FullEnrolmentPayload = components["schemas"]["FullEnrolmentPayload"];

export interface UseApplicationReturn {
  application: Application | null;
  isLoading: boolean;
  isInternational: boolean;
  programId: string | null;
  formDefaults: {
    step1: any;
    step2: any;
    step3: any;
    step4: any;
  };
  updateApplication: (payload: Partial<FullEnrolmentPayload>) => Promise<boolean>;
  refreshApplication: () => Promise<void>;
}

export function useApplication(applicationId: string): UseApplicationReturn {
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadApplication = useCallback(async () => {
    setIsLoading(true);
    try {
      const app = await applicationStateManager.fetchApplication(applicationId);
      setApplication(app);
    } catch (error) {
      console.error('Failed to load application:', error);
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  const updateApplication = useCallback(async (payload: Partial<FullEnrolmentPayload>): Promise<boolean> => {
    try {
      const updatedApp = await applicationStateManager.updateApplication(applicationId, payload);
      if (updatedApp) {
        setApplication(updatedApp);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update application:', error);
      return false;
    }
  }, [applicationId]);

  const refreshApplication = useCallback(async () => {
    await loadApplication();
  }, [loadApplication]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  const isInternational = application ? applicationStateManager.isInternationalStudent(application) : false;
  const programId = application ? applicationStateManager.getProgramId(application) : null;
  const formDefaults = application ? applicationStateManager.getFormDefaults(application) : {
    step1: {},
    step2: {},
    step3: {},
    step4: {}
  };

  return {
    application,
    isLoading,
    isInternational,
    programId,
    formDefaults,
    updateApplication,
    refreshApplication
  };
}
