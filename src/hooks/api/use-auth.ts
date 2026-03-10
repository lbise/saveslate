import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { User } from '@/types';

// ─── Query Keys ──────────────────────────────────────────────────────

export const authKeys = {
  user: ['auth', 'user'] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────

/** Fetch the currently authenticated user. Returns null when not logged in. */
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.user,
    queryFn: () => api.get<User>('/api/auth/me'),
    retry: false, // Don't retry on 401
  });
}

/** Login with email/password. Sets auth cookies on success. */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      api.post<User>('/api/auth/login', credentials),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.user, user);
    },
  });
}

/** Register a new account. Sets auth cookies on success. */
export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      email: string;
      name: string;
      password: string;
      defaultCurrency?: string;
    }) => api.post<User>('/api/auth/register', data),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.user, user);
    },
  });
}

/** Logout the current user. Clears auth cookies. */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<void>('/api/auth/logout'),
    onSuccess: () => {
      queryClient.setQueryData(authKeys.user, null);
      queryClient.clear(); // Clear all cached data
    },
  });
}

/** Update the current user's profile. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name?: string;
      email?: string;
      avatarUrl?: string;
      defaultCurrency?: string;
    }) => api.put<User>('/api/auth/me', data),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.user, user);
    },
  });
}
