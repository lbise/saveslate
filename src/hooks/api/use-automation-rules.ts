import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  AutomationRule,
  AutomationCondition,
  AutomationAction,
  AutomationTrigger,
  AutomationMatchMode,
  AutomationRunResult,
  AutomationTestResult,
} from '@/types';

// ─── Query Keys ──────────────────────────────────────────────────────

export const automationRuleKeys = {
  all: ['automationRules'] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────

/** List all automation rules. */
export function useAutomationRules() {
  return useQuery({
    queryKey: automationRuleKeys.all,
    queryFn: () => api.get<AutomationRule[]>('/api/automation-rules'),
  });
}

/** Create a new automation rule. */
export function useCreateAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      isEnabled?: boolean;
      triggers: AutomationTrigger[];
      matchMode?: AutomationMatchMode;
      conditions: AutomationCondition[];
      actions: AutomationAction[];
    }) => api.post<AutomationRule>('/api/automation-rules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationRuleKeys.all });
    },
  });
}

/** Update an automation rule. */
export function useUpdateAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string;
      name?: string;
      isEnabled?: boolean;
      triggers?: AutomationTrigger[];
      matchMode?: AutomationMatchMode;
      conditions?: AutomationCondition[];
      actions?: AutomationAction[];
    }) => api.put<AutomationRule>(`/api/automation-rules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationRuleKeys.all });
    },
  });
}

/** Delete an automation rule. */
export function useDeleteAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/automation-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationRuleKeys.all });
    },
  });
}

/** Run all enabled manual-run automation rules against all transactions. */
export function useRunAutomationRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<AutomationRunResult>('/api/automation-rules/run'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/** Test a rule against a sample transaction (does not persist). */
export function useTestAutomationRule() {
  return useMutation({
    mutationFn: ({ id, transaction }: { id: string; transaction: Record<string, unknown> }) =>
      api.post<AutomationTestResult>(`/api/automation-rules/${id}/test`, { transaction }),
  });
}
