/**
 * Auth API - ghanatalksradio-portal's Modules/Identity (see
 * AuthController), the sole backend for auth now. Previously this file
 * split dev/prod between this Laravel backend and the legacy
 * dev.ghanatalksradio.com CodeIgniter host; that split is gone now that
 * real user accounts have been migrated into Laravel's `users` table -
 * both web and the app now show the same account data. A legacy account
 * still gets the same forced-password-reset flow it always did
 * (AuthController detects the old md5 hash and routes it through
 * resetPassword() automatically - see that method's docblock), so a
 * migrated user's first login just prompts a password change, not a
 * failure.
 *
 * `deleteAccount` has no Laravel route yet (Identity's public API
 * doesn't expose one) - calling it throws a clear error instead of a
 * confusing 404.
 */
import { STREAMING_API_BASE_URL } from './streamingApi';

const AUTH_BASE_URL = `${STREAMING_API_BASE_URL}/api/auth`;

export class AuthApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
  }
}

/**
 * Thrown by loginUser() instead of returning normally when the account
 * predates this integration and still has a legacy md5-hashed password.
 * The account proved it knows the current password, but the server
 * won't start a session on that weak hash - it must set a new password
 * via resetPassword(resetTicket, ...) first.
 */
export class PasswordResetRequiredError extends Error {
  resetTicket: string;
  constructor(resetTicket: string) {
    super('Password reset required');
    this.name = 'PasswordResetRequiredError';
    this.resetTicket = resetTicket;
  }
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
}

export interface AuthResult {
  user: AuthUser;
  token: string;
  expiresAt: string;
}

/** Laravel's AuthController reads $request->input(), which parses a JSON
 * body just as happily as form-encoded - the token only ever needs to go
 * in the Authorization header (account.auth's EnsureAccountAuthenticated
 * has no query/body fallback, unlike the old CI backend did). */
async function authRequest(method: 'GET' | 'POST', path: string, body?: Record<string, unknown>, token?: string): Promise<any> {
  const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${AUTH_BASE_URL}/${path}`, {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
    });
  } catch (networkErr) {
    throw new AuthApiError(`Network error reaching auth API: ${(networkErr as Error).message}`, 0);
  }

  const json = await response.json().catch(() => null);
  if (!json || json.status !== true) {
    throw new AuthApiError(json?.message || `Auth API request failed (${response.status})`, response.status);
  }
  return json.data;
}

function toAuthResult(data: any): AuthResult {
  return { user: data.user, token: data.token, expiresAt: data.expires_at };
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  phone?: string
): Promise<AuthResult> {
  const data = await authRequest('POST', 'register', { name, email, password, phone: phone ?? '' });
  return toAuthResult(data);
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const data = await authRequest('POST', 'login', { email, password });
  if (data?.requires_password_reset) {
    throw new PasswordResetRequiredError(data.reset_ticket);
  }
  return toAuthResult(data);
}

export async function resetPassword(resetTicket: string, newPassword: string): Promise<AuthResult> {
  const data = await authRequest('POST', 'reset-password', { reset_ticket: resetTicket, new_password: newPassword });
  return toAuthResult(data);
}

/** Always resolves (the backend intentionally never reveals whether the
 * email is registered) - just triggers a PIN email if it is. */
export async function forgotPassword(email: string): Promise<void> {
  await authRequest('POST', 'forgot-password', { email });
}

export async function confirmPasswordResetPin(
  email: string,
  pin: string,
  newPassword: string
): Promise<AuthResult> {
  const data = await authRequest('POST', 'confirm-password-reset-pin', { email, pin, new_password: newPassword });
  return toAuthResult(data);
}

export async function changePassword(token: string, newPassword: string): Promise<void> {
  await authRequest('POST', 'change-password', { new_password: newPassword }, token);
}

export async function logoutUser(token: string): Promise<void> {
  await authRequest('POST', 'logout', {}, token);
}

/** Permanently deletes the account server-side. Irreversible - see
 * userStore.deleteAccount() for the confirmation flow. Laravel's
 * Identity module doesn't expose this yet (no route) - fails loudly
 * rather than silently 404ing. */
export async function deleteAccount(_token: string): Promise<void> {
  throw new AuthApiError('Account deletion is not available yet.', 0);
}

export async function fetchMe(token: string): Promise<AuthUser> {
  const data = await authRequest('GET', 'me', undefined, token);
  return data.user;
}
