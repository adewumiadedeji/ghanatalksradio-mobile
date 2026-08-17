/**
 * Raffle API - ghanatalksradio-portal's Modules/Engagement (see
 * PublicRaffleController) plus Billing's public payment endpoints (see
 * PublicPaymentController), the sole backend for raffles now.
 * dev.ghanatalksradio.com's raffle model (pick a 3-digit number, pay via
 * a Flutterwave checkout redirect) is retired - Engagement's model is
 * "enter free, or buy N tickets" instead, with a Billing Invoice behind
 * paid entries. Payment itself is still real Flutterwave, just reached
 * via Billing's generic invoice-checkout endpoints rather than a
 * raffle-specific payment API.
 */
import { Platform } from 'react-native';
import { STREAMING_API_BASE_URL } from './streamingApi';

const API_BASE_URL = `${STREAMING_API_BASE_URL}/api`;

export class RaffleApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'RaffleApiError';
    this.status = status;
  }
}

export interface RaffleSponsorDto {
  name: string;
}

export interface RaffleDto {
  slug: string;
  name: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  entries_close_at: string;
  requires_registered_user: boolean;
  allow_free_entry: boolean;
  entry_price: number | null;
  entry_currency: string | null;
  number_of_winners: number | null;
  sponsor: RaffleSponsorDto | null;
}

export interface InvoiceDto {
  id: number;
  invoice_number: string;
  amount: number;
  currency: string;
  due_date: string;
  status: string;
}

export interface RaffleEntryResult {
  entry: { id: number; ticket_count: number };
  invoice?: InvoiceDto;
}

export interface CheckoutResult {
  checkout_url: string;
  reference: string;
}

export interface VerifyPaymentResult {
  status: 'paid' | 'pending';
}

export interface RaffleEntryDto {
  raffle_slug: string;
  raffle_name: string;
  ticket_count: number;
  method: 'free' | 'paid';
  paid: boolean;
  entered_at: string;
  won: { status: string; claim_expires_at: string | null } | null;
}

async function apiGet<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers: { Accept: 'application/json' } });
  } catch (networkErr) {
    throw new RaffleApiError(`Network error reaching raffle API: ${(networkErr as Error).message}`, 0);
  }
  const json = await response.json().catch(() => null);
  if (!json || json.status !== true) {
    throw new RaffleApiError(json?.message || `Raffle API request failed (${response.status})`, response.status);
  }
  return json.data as T;
}

async function apiGetWithToken<T>(path: string, token: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
  } catch (networkErr) {
    throw new RaffleApiError(`Network error reaching raffle API: ${(networkErr as Error).message}`, 0);
  }
  const json = await response.json().catch(() => null);
  if (!json || json.status !== true) {
    throw new RaffleApiError(json?.message || `Raffle API request failed (${response.status})`, response.status);
  }
  return json.data as T;
}

async function apiPost<T>(path: string, body: Record<string, unknown>, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch (networkErr) {
    throw new RaffleApiError(`Network error reaching raffle API: ${(networkErr as Error).message}`, 0);
  }
  const json = await response.json().catch(() => null);
  if (!json || json.status !== true) {
    throw new RaffleApiError(json?.message || `Raffle API request failed (${response.status})`, response.status);
  }
  return json.data as T;
}

/** This device's platform, sent so the backend can enforce a raffle's
 * platform_availability - on the list (which raffle staff made available
 * here) and, since PublicRaffleController::isAvailableOnPlatform(), on
 * show()/enter() too (so a raffle hidden from this platform's list can't
 * be entered anyway via a known/guessed slug). Android/iOS only; the
 * website's equivalent client deliberately never sends this, so it
 * always sees and can enter every active raffle regardless of platform. */
function currentPlatform(): string {
  return Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : '';
}

export async function fetchActiveRaffles(): Promise<RaffleDto[]> {
  const platform = currentPlatform();
  const query = platform ? `?platform=${platform}` : '';
  const data = await apiGet<{ raffles: RaffleDto[] }>(`/raffles${query}`);
  return data.raffles;
}

export async function enterRaffleFree(
  slug: string,
  token?: string | null,
  guestToken?: string
): Promise<{ id: number; ticket_count: number }> {
  const data = await apiPost<{ entry: { id: number; ticket_count: number } }>(
    `/raffles/${encodeURIComponent(slug)}/enter`,
    { entry_method: 'free', guest_token: token ? undefined : guestToken, platform: currentPlatform() },
    token
  );
  return data.entry;
}

/** Creates a Billing invoice for `ticketCount` tickets, in `currency` if
 * given (defaults server-side to the raffle's own entry_currency) - see
 * RaffleEntryService::requestPaidEntry()'s docblock for why the currency
 * is locked in here, at entry time, rather than convertible later at
 * checkout. Pass the resulting invoice's invoice_number to
 * initiateCheckout() to get a real Flutterwave checkout_url. */
export async function enterRafflePaid(
  slug: string,
  ticketCount: number,
  token?: string | null,
  guestToken?: string,
  currency?: string
): Promise<RaffleEntryResult> {
  return apiPost<RaffleEntryResult>(
    `/raffles/${encodeURIComponent(slug)}/enter`,
    {
      entry_method: 'paid',
      ticket_count: ticketCount,
      currency,
      guest_token: token ? undefined : guestToken,
      platform: currentPlatform(),
    },
    token
  );
}

/** Every currency a raffle can be paid in - see
 * BillingDirectoryInterface::supportedCurrencies(). Fetched live rather
 * than hardcoded so the app never offers a currency the backend would
 * actually reject. */
export async function fetchSupportedCurrencies(): Promise<string[]> {
  const data = await apiGet<{ currencies: string[] }>('/raffles/currencies');
  return data.currencies;
}

export interface PreviewAmountResult {
  currency: string;
  amount: number;
}

/** Read-only currency-conversion preview - no entry/invoice created. Call
 * before the payer commits, to show "Pay {currency} {amount}" for
 * whichever currency they've picked. */
export async function previewAmount(
  slug: string,
  currency: string,
  ticketCount: number
): Promise<PreviewAmountResult> {
  return apiGet<PreviewAmountResult>(
    `/raffles/${encodeURIComponent(slug)}/preview-amount?currency=${encodeURIComponent(currency)}&ticket_count=${ticketCount}`
  );
}

/** Starts a real Flutterwave hosted checkout for an existing invoice -
 * see Billing's PublicPaymentController::initiate(). A signed-in
 * caller's email/name are resolved automatically server-side; a guest
 * must supply both. `redirectUrl` just needs to be a URL the caller can
 * recognize navigating to (see RafflePaymentScreen's REDIRECT_MARKER) -
 * it doesn't need to render anything meaningful. */
export async function initiateCheckout(
  invoiceNumber: string,
  redirectUrl: string,
  token?: string | null,
  email?: string,
  name?: string
): Promise<CheckoutResult> {
  return apiPost<CheckoutResult>('/payments/initiate', {
    invoice_number: invoiceNumber,
    redirect_url: redirectUrl,
    email,
    name,
  }, token);
}

/** Re-verifies payment directly with Flutterwave (never trusts the
 * WebView redirect URL alone) - call right after the checkout WebView
 * navigates to `redirectUrl`. */
export async function verifyPayment(reference: string): Promise<VerifyPaymentResult> {
  return apiPost<VerifyPaymentResult>('/payments/verify', { reference });
}

export async function fetchMyRaffleEntries(token: string): Promise<RaffleEntryDto[]> {
  const data = await apiGetWithToken<{ entries: RaffleEntryDto[] }>('/raffles/my-entries', token);
  return data.entries;
}
