import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchActiveRaffles,
  fetchMyRaffleEntries,
  fetchSupportedCurrencies,
  enterRaffleFree,
  enterRafflePaid,
  initiateCheckout,
  verifyPayment,
  previewAmount,
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

export function useEnterRaffleFree() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { slug: string; token?: string | null; guestToken?: string }) =>
      enterRaffleFree(vars.slug, vars.token, vars.guestToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raffles', 'my-entries'] });
    },
  });
}

export function useEnterRafflePaid() {
  return useMutation({
    mutationFn: (vars: {
      slug: string;
      ticketCount: number;
      token?: string | null;
      guestToken?: string;
      currency?: string;
    }) => enterRafflePaid(vars.slug, vars.ticketCount, vars.token, vars.guestToken, vars.currency),
  });
}

export function useSupportedCurrencies() {
  return useQuery({
    queryKey: ['raffles', 'currencies'],
    queryFn: fetchSupportedCurrencies,
    staleTime: Infinity, // static config, doesn't change during a session
  });
}

export function usePreviewAmount(slug: string | null, currency: string | null, ticketCount: number) {
  return useQuery({
    queryKey: ['raffles', 'preview-amount', slug, currency, ticketCount],
    queryFn: () => previewAmount(slug as string, currency as string, ticketCount),
    enabled: Boolean(slug) && Boolean(currency),
    staleTime: STALE_TIME,
  });
}

export function useInitiateCheckout() {
  return useMutation({
    mutationFn: (vars: { invoiceNumber: string; redirectUrl: string; token?: string | null; email?: string; name?: string }) =>
      initiateCheckout(vars.invoiceNumber, vars.redirectUrl, vars.token, vars.email, vars.name),
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { reference: string }) => verifyPayment(vars.reference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raffles', 'my-entries'] });
      queryClient.invalidateQueries({ queryKey: ['raffles', 'active'] });
    },
  });
}
