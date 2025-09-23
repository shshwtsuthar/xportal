import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FUNCTIONS_URL, getFunctionHeaders } from '@/lib/functions';
import { Step1PersonalInfo, Step2AcademicInfo, Step3ProgramSelection, Step4AgentReferral, Step5FinancialArrangements, FullEnrolmentPayload } from '@/lib/schemas/application-schemas';

// =============================================================================
// APPLICATION WIZARD STATE MANAGEMENT
// Uses Zustand for optimal performance and built-in persistence
// =============================================================================

interface ApplicationWizardState {
  // Current wizard state
  currentStep: number;
  totalSteps: number;
  isDirty: boolean;
  isLoading: boolean;
  
  // Form data (matches backend FullEnrolmentPayload exactly)
  formData: Partial<FullEnrolmentPayload>;
  
  // Validation state
  validationErrors: Record<string, string[]>;
  
  // Draft management
  draftId: string | null;
  lastSaved: Date | null;
  
  // Actions
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  
  // Form data management
  updateFormData: (data: Partial<FullEnrolmentPayload>) => void;
  updateStep1Data: (data: Step1PersonalInfo) => void;
  updateStep2Data: (data: Step2AcademicInfo) => void;
  updateStep3Data: (data: Step3ProgramSelection) => void;
  updateStep4Data: (data: Step4AgentReferral) => void;
  updateStep5Data: (data: Step5FinancialArrangements) => void;
  
  // Passport processing
  updateFromPassportData: (passportData: any) => void;
  
  // Validation
  setValidationErrors: (errors: Record<string, string[]>) => void;
  clearValidationErrors: () => void;
  
  // Draft operations
  createDraft: () => Promise<string>;
  saveDraft: () => Promise<void>;
  loadDraft: (draftId: string) => Promise<void>;
  
  // Application lifecycle
  submitApplication: () => Promise<void>;
  
  // Utility
  resetWizard: () => void;
  markDirty: () => void;
  markClean: () => void;
}

const initialState = {
  currentStep: 1,
  totalSteps: 7,
  isDirty: false,
  isLoading: false,
  formData: {
    isInternationalStudent: false,
  } as Partial<FullEnrolmentPayload>,
  validationErrors: {},
  draftId: null,
  lastSaved: null,
};

export const useApplicationWizard = create<ApplicationWizardState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Step navigation
      setCurrentStep: (step: number) => {
        const { totalSteps } = get();
        if (step >= 1 && step <= totalSteps) {
          set({ currentStep: step });
        }
      },
      
      nextStep: () => {
        const { currentStep, totalSteps } = get();
        if (currentStep < totalSteps) {
          set({ currentStep: currentStep + 1 });
        }
      },
      
      previousStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
          set({ currentStep: currentStep - 1 });
        }
      },
      
      // Form data management
      updateFormData: (data: Partial<FullEnrolmentPayload>) => {
        set((state) => ({
          formData: { ...state.formData, ...data },
          isDirty: true,
        }));
      },
      
      updateStep1Data: (data: Step1PersonalInfo) => {
        set((state) => ({
          formData: {
            ...state.formData,
            personalDetails: data.personalDetails,
            address: data.address,
            // Store emergency contact in a custom field for now
            emergencyContact: data.emergencyContact,
          },
          isDirty: true,
        }));
      },
      
      updateStep2Data: (data: Step2AcademicInfo) => {
        set((state) => ({
          formData: {
            ...state.formData,
            avetmissDetails: data.avetmissDetails,
            // Persist USI and CRICOS alongside AVETMISS so hydration works across navigation
            // @ts-ignore
            usi: (data as any).usi,
            // @ts-ignore
            cricosDetails: (data as any).cricosDetails,
          },
          isDirty: true,
        }));
      },
      
      updateStep3Data: (data: Step3ProgramSelection) => {
        set((state) => ({
          formData: {
            ...state.formData,
            enrolmentDetails: data.enrolmentDetails,
          },
          isDirty: true,
        }));
      },
      
      updateStep4Data: (data: Step4AgentReferral) => {
        set((state) => ({
          formData: {
            ...state.formData,
            agentId: data.agentReferral.agentId,
            // Store additional referral data in custom fields for now
            referralSource: data.agentReferral.referralSource,
            marketingAttribution: data.agentReferral.marketingAttribution,
            referralNotes: data.agentReferral.referralNotes,
          },
          isDirty: true,
        }));
      },
      
      updateStep5Data: (data: Step5FinancialArrangements & { selectedTemplateId?: string; anchor?: string; anchorDate?: string }) => {
        set((state) => ({
          formData: {
            ...state.formData,
            // Store financial data in custom fields for now
            paymentPlan: data.financialArrangements.paymentPlan,
            tuitionFeeSnapshot: data.financialArrangements.tuitionFeeSnapshot,
            agentCommissionRateSnapshot: data.financialArrangements.agentCommissionRateSnapshot,
            paymentMethod: data.financialArrangements.paymentMethod,
            installmentCount: data.financialArrangements.installmentCount,
            installmentAmount: data.financialArrangements.installmentAmount,
            paymentSchedule: data.financialArrangements.paymentSchedule,
            specialArrangements: data.financialArrangements.specialArrangements,
            financialNotes: data.financialArrangements.financialNotes,
            // Store template selection data for backend
            selectedTemplateId: data.selectedTemplateId,
            anchor: data.anchor,
            anchorDate: data.anchorDate,
          },
          isDirty: true,
        }));
      },
      
      // Passport processing
      updateFromPassportData: (passportData: any) => {
        set((state) => {
          const currentFormData = state.formData;
          const updates: Partial<FullEnrolmentPayload> = {};
          
          // Update personal details if available
          if (passportData.firstName || passportData.lastName || passportData.gender || passportData.dateOfBirth) {
            updates.personalDetails = {
              ...currentFormData.personalDetails,
              ...(passportData.firstName && { firstName: passportData.firstName }),
              ...(passportData.lastName && { lastName: passportData.lastName }),
              ...(passportData.gender && { gender: passportData.gender }),
              ...(passportData.dateOfBirth && { dateOfBirth: passportData.dateOfBirth }),
            };
          }
          
          // Update CRICOS details if international student and passport data available
          if (currentFormData.isInternationalStudent && (passportData.passportNumber || passportData.issuingCountry || passportData.dateOfExpiry)) {
            updates.cricosDetails = {
              ...currentFormData.cricosDetails,
              ...(passportData.passportNumber && { passportNumber: passportData.passportNumber }),
              ...(passportData.issuingCountry && { countryOfCitizenshipId: passportData.issuingCountry }),
              ...(passportData.dateOfExpiry && { passportExpiryDate: passportData.dateOfExpiry }),
            };
          }
          
          // Update AVETMISS details if nationality available
          if (passportData.nationality) {
            (updates as any).avetmissDetails = {
              ...currentFormData.avetmissDetails,
              countryOfBirthId: passportData.nationality,
            };
          }
          
          // Store raw passport data for reference
          (updates as any).passportExtractionData = {
            ...(currentFormData as any).passportExtractionData,
            extractedAt: new Date().toISOString(),
            rawData: passportData,
          };
          
          return {
            formData: {
              ...currentFormData,
              ...updates,
            },
            isDirty: true,
          };
        });
      },
      
      // Validation
      setValidationErrors: (errors: Record<string, string[]>) => {
        set({ validationErrors: errors });
      },
      
      clearValidationErrors: () => {
        set({ validationErrors: {} });
      },
      
      // Draft operations
      createDraft: async (): Promise<string> => {
        set({ isLoading: true });
        try {
          // Check if we're in browser environment
          if (typeof window === 'undefined') {
            set({ isLoading: false });
            throw new Error('Cannot create draft in server environment');
          }
          
          const idempotencyKey = crypto.randomUUID();
          const { formData } = get();
          const res = await fetch(`${FUNCTIONS_URL}/applications`, {
            method: 'POST',
            headers: { ...getFunctionHeaders(), 'Idempotency-Key': idempotencyKey },
            body: JSON.stringify(formData),
          });
          if (!res.ok) throw new Error('Failed to create draft application');
          const etag = res.headers.get('ETag');
          const data = await res.json();
          const draftId: string = data?.id;
          if (!draftId) throw new Error('No application id returned');
          if (etag) {
            window.localStorage.setItem(`app-etag:${draftId}`, etag);
          }
          set({
            draftId,
            lastSaved: new Date(),
            isLoading: false,
          });
          return draftId;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      
      saveDraft: async (): Promise<void> => {
        const { draftId, formData } = get();
        if (!draftId) {
          throw new Error('No draft ID available');
        }
        
        // Check if we're in browser environment
        if (typeof window === 'undefined') {
          throw new Error('Cannot save draft in server environment');
        }
        
        set({ isLoading: true });
        try {
          // Get ETag for optimistic concurrency control
          const etag = window.localStorage.getItem(`app-etag:${draftId}`);
          
          const headers = { ...getFunctionHeaders() };
          if (etag) {
            headers['If-Match'] = etag;
          }
          
          const res = await fetch(`${FUNCTIONS_URL}/applications/${draftId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(formData),
          });
          
          if (!res.ok) {
            if (res.status === 412) {
              throw new Error('Draft is out of date. Please refresh the page.');
            }
            throw new Error(`Failed to save draft: ${res.statusText}`);
          }
          
          // Update ETag for next save
          const newEtag = res.headers.get('ETag');
          if (newEtag) {
            window.localStorage.setItem(`app-etag:${draftId}`, newEtag);
          }
          
          set({ 
            lastSaved: new Date(),
            isDirty: false,
            isLoading: false 
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      
      loadDraft: async (draftId: string): Promise<void> => {
        set({ isLoading: true });
        try {
          // Check if we're in browser environment
          if (typeof window === 'undefined') {
            set({ isLoading: false });
            return;
          }
          
          const res = await fetch(`${FUNCTIONS_URL}/applications/${draftId}`, {
            headers: getFunctionHeaders(),
          });
          if (!res.ok) {
            if (res.status === 404) {
              console.warn(`Draft ${draftId} not found, treating as new draft`);
              set({ isLoading: false });
              return;
            }
            throw new Error(`Failed to load draft: ${res.status} ${res.statusText}`);
          }
          const data = await res.json();
          const payload = (data?.application_payload ?? {}) as Partial<FullEnrolmentPayload>;
          set({ 
            draftId,
            formData: { ...(payload as any) },
            isLoading: false 
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      
      // Application submission
      submitApplication: async (): Promise<void> => {
        const { draftId } = get();
        if (!draftId) {
          throw new Error('No draft ID available');
        }
        
        set({ isLoading: true });
        try {
          // TODO: Implement API call to submit application
          // await api.post(`/applications/${draftId}/submit`);
          
          // Mock implementation for now
          console.log('Submitting application:', draftId);
          
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      
      // Utility functions
      resetWizard: () => {
        set(initialState);
      },
      
      markDirty: () => {
        set({ isDirty: true });
      },
      
      markClean: () => {
        set({ isDirty: false });
      },
    }),
    {
      name: 'application-wizard-storage',
      partialize: (state) => ({
        currentStep: state.currentStep,
        formData: state.formData,
        draftId: state.draftId,
        lastSaved: state.lastSaved,
      }),
    }
  )
);

// Hook for unsaved changes warning
export const useUnsavedChangesWarning = () => {
  const { isDirty } = useApplicationWizard();
  
  React.useEffect(() => {
    // Only add event listener in browser environment
    if (typeof window === 'undefined') return;
    
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };
    
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
};
