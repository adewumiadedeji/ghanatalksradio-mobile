/**
 * Raffle API - same CodeIgniter backend as authApi.ts. Raffle listing is
 * public; initiating/verifying a paid entry requires a bearer token.
 */
export const RAFFLE_API_BASE_URL = 'https://dev.ghanatalksradio.com/index.php/api';

export class RaffleApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'RaffleApiError';
    this.status = status;
  }
}

export interface RaffleDto {
  id: number;
  name: string;
  week: number;
  amount: string;
  startdate: string;
  enddate: string;
  toWin: string;
  amount_to_win: string;
  entries_count: number;
  // Backend-controlled per-draw switch (see wp_raffle.payment_mode) - lets a
  // specific raffle be entered with no payment at all, e.g. for an App Store
  // review build without needing an app-wide/client-side flag.
  payment_mode: 'dev' | 'prod';
}

export interface InitiatePaymentResult {
  txRef: string;
  checkoutUrl: string;
  amount: string;
  currency: string;
}

export interface PreviewAmountResult {
  currency: string;
  amount: string;
}

export interface VerifyPaymentResult {
  raffleNumber: string;
}

async function getJsonWithToken(path: string, token: string): Promise<any> {
  let response: Response;
  try {
    // token is also passed as a query param in case the Authorization
    // header gets stripped by the host before reaching PHP (see the same
    // fallback in Api.php's _extract_token()).
    response = await fetch(`${RAFFLE_API_BASE_URL}/${path}?token=${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
  } catch (networkErr) {
    throw new RaffleApiError(`Network error reaching raffle API: ${(networkErr as Error).message}`, 0);
  }
  if (!response.ok) {
    throw new RaffleApiError(`Raffle API request failed (${response.status})`, response.status);
  }
  const json = await response.json();
  if (json?.status !== true) {
    throw new RaffleApiError(json?.message || 'Raffle API returned an error', 200);
  }
  return json.data;
}

async function getJson(path: string): Promise<any> {
  let response: Response;
  try {
    response = await fetch(`${RAFFLE_API_BASE_URL}/${path}`, {
      headers: { Accept: 'application/json' },
    });
  } catch (networkErr) {
    throw new RaffleApiError(`Network error reaching raffle API: ${(networkErr as Error).message}`, 0);
  }
  if (!response.ok) {
    throw new RaffleApiError(`Raffle API request failed (${response.status})`, response.status);
  }
  const json = await response.json();
  if (json?.status !== true) {
    throw new RaffleApiError(json?.message || 'Raffle API returned an error', 200);
  }
  return json.data;
}

async function postForm(path: string, fields: Record<string, string>, token: string): Promise<any> {
  let response: Response;
  try {
    // token is sent both as a header and a body field - see the matching
    // comment in authApi.ts's postForm() for why the fallback matters.
    response = await fetch(`${RAFFLE_API_BASE_URL}/${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${token}`,
      },
      body: new URLSearchParams({ ...fields, token }).toString(),
    });
  } catch (networkErr) {
    throw new RaffleApiError(`Network error reaching raffle API: ${(networkErr as Error).message}`, 0);
  }
  if (!response.ok) {
    throw new RaffleApiError(`Raffle API request failed (${response.status})`, response.status);
  }
  const json = await response.json();
  if (json?.status !== true) {
    throw new RaffleApiError(json?.message || 'Raffle API returned an error', 200);
  }
  return json.data;
}

export async function fetchActiveRaffles(): Promise<RaffleDto[]> {
  return getJson('raffle_list');
}

export interface RaffleEntryDto {
  id: number;
  raffle_id: number;
  raffle_number: string;
  status: string;
  payment_status: number;
  dates: number;
}

export async function fetchMyRaffleEntries(token: string): Promise<RaffleEntryDto[]> {
  return getJsonWithToken('my_raffle_entries', token);
}

export async function previewRaffleAmount(
  token: string,
  raffleId: number,
  currency: string
): Promise<PreviewAmountResult> {
  const data = await postForm(
    'raffle_preview_amount',
    { raffle_id: String(raffleId), currency },
    token
  );
  return { currency: data.currency, amount: data.amount };
}

export async function initiateRafflePayment(
  token: string,
  raffleId: number,
  raffleNumber: string,
  phone: string,
  deviceId: string,
  currency: string
): Promise<InitiatePaymentResult> {
  const data = await postForm(
    'raffle_initiate_payment',
    { raffle_id: String(raffleId), raffle_number: raffleNumber, phone, device_id: deviceId, currency },
    token
  );
  return { txRef: data.tx_ref, checkoutUrl: data.checkout_url, amount: data.amount, currency: data.currency };
}

export async function verifyRafflePayment(token: string, txRef: string): Promise<VerifyPaymentResult> {
  const data = await postForm('raffle_verify_payment', { tx_ref: txRef }, token);
  return { raffleNumber: data.raffle_number };
}
