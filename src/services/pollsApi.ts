/**
 * Polls API - same CodeIgniter backend as auth/raffle. Listing is public
 * (a token, if provided, just enriches the response with your_option_id);
 * voting requires a bearer token.
 */
export const POLLS_API_BASE_URL = 'https://dev.ghanatalksradio.com/index.php/api';

export class PollsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'PollsApiError';
    this.status = status;
  }
}

export interface PollOptionDto {
  id: number;
  text: string;
  votes: number;
}

export interface PollDto {
  id: number;
  question: string;
  reward_points: number;
  options: PollOptionDto[];
  your_option_id: number | null;
}

export async function fetchPollList(token?: string | null): Promise<PollDto[]> {
  // token is passed both ways - as a header and a query param - since some
  // shared-hosting PHP setups strip the Authorization header before it
  // reaches the app (see the same fallback in authApi.ts/raffleApi.ts).
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${POLLS_API_BASE_URL}/poll_list${query}`, { headers });
  } catch (networkErr) {
    throw new PollsApiError(`Network error reaching polls API: ${(networkErr as Error).message}`, 0);
  }

  if (!response.ok) {
    throw new PollsApiError(`Polls API request failed (${response.status})`, response.status);
  }

  const json = await response.json();
  if (json?.status !== true) {
    throw new PollsApiError(json?.message || 'Polls API returned an error', 200);
  }
  return json.data;
}

export async function voteOnPoll(token: string, pollId: number, optionId: number): Promise<PollDto> {
  const fields = { poll_id: String(pollId), option_id: String(optionId), token };

  let response: Response;
  try {
    response = await fetch(`${POLLS_API_BASE_URL}/poll_vote`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${token}`,
      },
      body: new URLSearchParams(fields).toString(),
    });
  } catch (networkErr) {
    throw new PollsApiError(`Network error reaching polls API: ${(networkErr as Error).message}`, 0);
  }

  if (!response.ok) {
    throw new PollsApiError(`Polls API request failed (${response.status})`, response.status);
  }

  const json = await response.json();
  if (json?.status !== true) {
    throw new PollsApiError(json?.message || 'Polls API returned an error', 200);
  }
  return json.data;
}
