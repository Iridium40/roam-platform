import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/endpoints";
import type { OnboardingStatus, ApplicationSubmissionData, Phase2TokenValidation } from "@/shared/types";

export const useOnboardingStatus = (userId: string) => {
  return useQuery({
    queryKey: ["onboarding", "status", userId],
    queryFn: () => api.onboarding.getStatus(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useSubmitBusinessInfo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.onboarding.submitBusinessInfo,
    onSuccess: (data, variables) => {
      // Invalidate and refetch onboarding status
      queryClient.invalidateQueries({
        queryKey: ["onboarding", "status"],
      });
      
      // Update cache with new business ID
      queryClient.setQueryData(
        ["onboarding", "status", variables.userId],
        (old: any) => ({
          ...old,
          businessData: { id: data.businessId, ...variables },
        })
      );
    },
    onError: (error) => {
      console.error("Failed to submit business info:", error);
    },
  });
};

export const useUploadDocuments = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.onboarding.uploadDocuments,
    onSuccess: (data, variables) => {
      // Invalidate onboarding status to reflect new documents
      queryClient.invalidateQueries({
        queryKey: ["onboarding", "status"],
      });
    },
    onError: (error) => {
      console.error("Failed to upload documents:", error);
    },
  });
};

export const useSubmitApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.onboarding.submitApplication,
    onSuccess: (data, variables) => {
      // Invalidate onboarding status
      queryClient.invalidateQueries({
        queryKey: ["onboarding", "status"],
      });
      
      // Update cache with application data
      queryClient.setQueryData(
        ["onboarding", "status", variables.userId],
        (old: any) => ({
          ...old,
          applicationData: { id: data.applicationId, ...variables },
          phase: "phase2",
        })
      );
    },
    onError: (error) => {
      console.error("Failed to submit application:", error);
    },
  });
};

export const useValidatePhase2Token = () => {
  return useMutation({
    mutationFn: api.onboarding.validatePhase2Token,
    onError: (error) => {
      console.error("Failed to validate Phase 2 token:", error);
    },
  });
};

export const useSavePhase2Progress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.onboarding.savePhase2Progress,
    onSuccess: (data, variables) => {
      // Invalidate phase 2 progress
      queryClient.invalidateQueries({
        queryKey: ["onboarding", "phase2-progress", variables.businessId],
      });
    },
    onError: (error) => {
      console.error("Failed to save Phase 2 progress:", error);
    },
  });
};

export const usePhase2Progress = (businessId: string) => {
  return useQuery({
    queryKey: ["onboarding", "phase2-progress", businessId],
    queryFn: () => api.onboarding.getPhase2Progress(businessId),
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCompleteOnboarding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.onboarding.complete,
    onSuccess: (data, variables) => {
      // Invalidate all onboarding-related queries
      queryClient.invalidateQueries({
        queryKey: ["onboarding"],
      });
      
      // Update cache to mark onboarding as complete
      queryClient.setQueryData(
        ["onboarding", "status", variables.userId],
        (old: any) => ({
          ...old,
          phase: "complete",
          setupProgress: { ...old.setupProgress, setup_completed_at: new Date().toISOString() },
        })
      );
    },
    onError: (error) => {
      console.error("Failed to complete onboarding:", error);
    },
  });
};
