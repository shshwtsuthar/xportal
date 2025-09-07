import { createClient } from "@/lib/supabase/client";
import { ErrorHandler } from "@/lib/error-handler";
import type { components } from "../supabase/functions/_shared/api.types";

type FullEnrolmentPayload = components["schemas"]["FullEnrolmentPayload"];
type Application = components["schemas"]["Application"];

export class ApplicationStateManager {
  private static instance: ApplicationStateManager;
  private cache: Map<string, Application> = new Map();

  static getInstance(): ApplicationStateManager {
    if (!ApplicationStateManager.instance) {
      ApplicationStateManager.instance = new ApplicationStateManager();
    }
    return ApplicationStateManager.instance;
  }

  /**
   * Fetch application data from the server
   */
  async fetchApplication(applicationId: string): Promise<Application | null> {
    try {
      // Check cache first
      if (this.cache.has(applicationId)) {
        return this.cache.get(applicationId)!;
      }

      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke(`applications/${applicationId}`, {
        method: 'GET'
      });

      if (error) throw error;

      const application = data as Application;
      this.cache.set(applicationId, application);
      return application;
    } catch (error) {
      ErrorHandler.handleApiError(error, `Fetching application ${applicationId}`);
      return null;
    }
  }

  /**
   * Update application data on the server
   */
  async updateApplication(applicationId: string, payload: Partial<FullEnrolmentPayload>): Promise<Application | null> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke(`applications/${applicationId}`, {
        method: 'PATCH',
        body: payload
      });

      if (error) throw error;

      const application = data as Application;
      this.cache.set(applicationId, application);
      return application;
    } catch (error) {
      ErrorHandler.handleApiError(error, `Updating application ${applicationId}`);
      return null;
    }
  }

  /**
   * Get cached application data
   */
  getCachedApplication(applicationId: string): Application | null {
    return this.cache.get(applicationId) || null;
  }

  /**
   * Clear cache for an application
   */
  clearCache(applicationId: string): void {
    this.cache.delete(applicationId);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Get form default values from application data
   */
  getFormDefaults(application: Application): {
    step1: any;
    step2: any;
    step3: any;
    step4: any;
  } {
    const payload = application.application_payload;
    if (!payload) {
      return {
        step1: {},
        step2: {},
        step3: {},
        step4: {}
      };
    }

    return {
      step1: {
        isInternationalStudent: payload.isInternationalStudent || false,
        agentId: payload.agentId || null,
        enrolmentDetails: {
          programId: payload.enrolmentDetails?.programId || '',
          courseOfferingId: payload.enrolmentDetails?.courseOfferingId || '',
        }
      },
      step2: {
        personalDetails: payload.personalDetails || {},
        address: payload.address || {
          residential: {},
          isPostalSameAsResidential: true,
          postal: undefined
        }
      },
      step3: {
        avetmissDetails: payload.avetmissDetails || {},
        cricosDetails: payload.cricosDetails || undefined,
        usi: payload.usi || undefined
      },
      step4: {
        enrolmentDetails: {
          programId: payload.enrolmentDetails?.programId || '',
          subjectStructure: payload.enrolmentDetails?.subjectStructure || {
            coreSubjectIds: [],
            electiveSubjectIds: []
          },
          startDate: payload.enrolmentDetails?.startDate || '',
          expectedCompletionDate: payload.enrolmentDetails?.expectedCompletionDate || '',
          deliveryLocationId: payload.enrolmentDetails?.deliveryLocationId || '',
          deliveryModeId: payload.enrolmentDetails?.deliveryModeId || '',
          fundingSourceId: payload.enrolmentDetails?.fundingSourceId || '',
          studyReasonId: payload.enrolmentDetails?.studyReasonId || '',
          isVetInSchools: payload.enrolmentDetails?.isVetInSchools || false,
        }
      }
    };
  }

  /**
   * Check if application is international student
   */
  isInternationalStudent(application: Application): boolean {
    return application.application_payload?.isInternationalStudent || false;
  }

  /**
   * Get program ID from application
   */
  getProgramId(application: Application): string | null {
    return application.application_payload?.enrolmentDetails?.programId || null;
  }
}

// Export singleton instance
export const applicationStateManager = ApplicationStateManager.getInstance();
