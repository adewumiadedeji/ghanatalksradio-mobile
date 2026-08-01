import { useQuery, useMutation } from '@tanstack/react-query';
import {
  fetchActiveRaffles,
  fetchMyRaffleEntries,
  initiateRafflePayment,
  previewRaffleAmount,
  verifyRafflePayment,
} from './raffleApi';

const STALE_TIME = 60 * 1000; // 1 min - entry counts change as people pay

export function useActiveRaffles() {
  return useQuery({
    queryKey: ['raffles', 'active'],
    queryFn: fetchActiveRaffles,
    staleTime: STALE_TIME,
  });
}

export function useMyRaffleEntries(token: string | null) {
  return useQuery({
    queryKey: ['raffles', 'my-entries', token],
    queryFn: () => fetchMyRaffleEntries(token as string),
    enabled: Boolean(token),
    staleTime: STALE_TIME,
  });
}

export function useRafflePreviewAmount(token: string | null, raffleId: number | null, currency: string) {
  return useQuery({
    queryKey: ['raffles', 'preview-amount', raffleId, currency],
    queryFn: () => previewRaffleAmount(token as string, raffleId as number, currency),
    enabled: Boolean(token) && Boolean(raffleId),
    staleTime: STALE_TIME,
  });
}

export function useInitiateRafflePayment() {
  return useMutation({
    mutationFn: (vars: {
      token: string;
      raffleId: number;
      raffleNumber: string;
      phone: string;
      deviceId: string;
      currency: string;
    }) => initiateRafflePayment(vars.token, vars.raffleId, vars.raffleNumber, vars.phone, vars.deviceId, vars.currency),
  });
}

export function useVerifyRafflePayment() {
  return useMutation({
    mutationFn: (vars: { token: string; txRef: string }) => verifyRafflePayment(vars.token, vars.txRef),
  });
}
