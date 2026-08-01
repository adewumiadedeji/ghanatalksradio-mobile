/**
 * Auth API for the CodeIgniter backend at dev.ghanatalksradio.com - a
 * separate PHP app from the WordPress REST API and from the podcast/catchup
 * API, but on the same host. Reads request bodies via CI's
 * $this->input->post(), which expects standard form-encoded bodies, NOT
 * JSON - every request here sends `application/x-www-form-urlencoded`.
 */
export const AUTH_API_BASE_URL = 'https://dev.ghanatalksradio.com/index.php/api';

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

async function postForm(path: string, fields: Record<string, string>, token?: string): Promise<any> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  // Sent both ways deliberately: some shared-hosting PHP setups strip the
  // Authorization header before it reaches the app, so the token also
  // rides along as a plain form field, which the backend accepts as a
  // fallback (see Api.php's _extract_token()).
  const body = token ? { ...fields, token } : fields;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${AUTH_API_BASE_URL}/${path}`, {
      method: 'POST',
      headers,
      body: new URLSearchParams(body).toString(),
    });
  } catch (networkErr) {
    throw new AuthApiError(`Network error reaching auth API: ${(networkErr as Error).message}`, 0);
  }

  if (!response.ok) {
    throw new AuthApiError(`Auth API request failed (${response.status})`, response.status);
  }

  const json = await response.json();
  if (json?.status !== true) {
    throw new AuthApiError(json?.message || 'Auth API returned an error', 200);
  }
  return json.data;
}

async function getWithToken(path: string, token: string): Promise<any> {
  let response: Response;
  try {
    // token is also passed as a query param for the same reason as
    // postForm() includes it in the body - see comment there.
    response = await fetch(`${AUTH_API_BASE_URL}/${path}?token=${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
  } catch (networkErr) {
    throw new AuthApiError(`Network error reaching auth API: ${(networkErr as Error).message}`, 0);
  }

  if (!response.ok) {
    throw new AuthApiError(`Auth API request failed (${response.status})`, response.status);
  }

  const json = await response.json();
  if (json?.status !== true) {
    throw new AuthApiError(json?.message || 'Auth API returned an error', 200);
  }
  return json.data;
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  phone?: string
): Promise<AuthResult> {
  const data = await postForm('register', { name, email, password, phone: phone ?? '' });
  return { user: data.user, token: data.token, expiresAt: data.expires_at };
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const data = await postForm('login', { email, password });
  if (data?.requires_password_reset) {
    throw new PasswordResetRequiredError(data.reset_ticket);
  }
  return { user: data.user, token: data.token, expiresAt: data.expires_at };
}

export async function resetPassword(resetTicket: string, newPassword: string): Promise<AuthResult> {
  const data = await postForm('reset_password', { reset_ticket: resetTicket, new_password: newPassword });
  return { user: data.user, token: data.token, expiresAt: data.expires_at };
}

/** Always resolves (the backend intentionally never reveals whether the
 * email is registered) - just triggers a PIN email if it is. */
export async function forgotPassword(email: string): Promise<void> {
  await postForm('forgot_password', { email });
}

export async function confirmPasswordResetPin(
  email: string,
  pin: string,
  newPassword: string
): Promise<AuthResult> {
  const data = await postForm('confirm_password_reset_pin', { email, pin, new_password: newPassword });
  return { user: data.user, token: data.token, expiresAt: data.expires_at };
}

export async function changePassword(token: string, newPassword: string): Promise<void> {
  await postForm('change_password', { new_password: newPassword }, token);
}

export async function logoutUser(token: string): Promise<void> {
  await postForm('logout', {}, token);
}

export async function fetchMe(token: string): Promise<AuthUser> {
  const data = await getWithToken('me', token);
  return data.user;
}
