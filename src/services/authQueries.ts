import { useMutation, useQuery } from '@tanstack/react-query';
import {
  registerUser,
  loginUser,
  logoutUser,
  fetchMe,
  resetPassword,
  forgotPassword,
  confirmPasswordResetPin,
  changePassword,
} from './authApi';

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (vars: { name: string; email: string; password: string; phone?: string }) =>
      registerUser(vars.name, vars.email, vars.password, vars.phone),
  });
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: (vars: { email: string; password: string }) => loginUser(vars.email, vars.password),
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (vars: { resetTicket: string; newPassword: string }) =>
      resetPassword(vars.resetTicket, vars.newPassword),
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (email: string) => forgotPassword(email),
  });
}

export function useConfirmResetPinMutation() {
  return useMutation({
    mutationFn: (vars: { email: string; pin: string; newPassword: string }) =>
      confirmPasswordResetPin(vars.email, vars.pin, vars.newPassword),
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (vars: { token: string; newPassword: string }) => changePassword(vars.token, vars.newPassword),
  });
}

export function useLogoutMutation() {
  return useMutation({
    mutationFn: (token: string) => logoutUser(token),
  });
}

/** Cold-start session check - only enabled when a persisted token exists. */
export function useMeQuery(token: string | null) {
  return useQuery({
    queryKey: ['auth', 'me', token],
    queryFn: () => fetchMe(token as string),
    enabled: Boolean(token),
    retry: false,
  });
}
