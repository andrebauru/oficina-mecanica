export const SESSION_TIMEOUT_MS = 60 * 60 * 1000;
const AUTH_KEY = 'authenticated';
const LAST_ACTIVITY_KEY = 'auth-last-activity';

export function startSession(): void {
  sessionStorage.setItem(AUTH_KEY, 'true');
  touchSession();
}

export function touchSession(): void {
  sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function clearSession(): void {
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(LAST_ACTIVITY_KEY);
}

export function isSessionAuthenticated(): boolean {
  if (sessionStorage.getItem(AUTH_KEY) !== 'true') return false;
  return !isSessionExpired();
}

export function isSessionExpired(): boolean {
  const raw = sessionStorage.getItem(LAST_ACTIVITY_KEY);
  if (!raw) return true;
  const lastActivity = Number(raw);
  if (!Number.isFinite(lastActivity)) return true;
  return Date.now() - lastActivity > SESSION_TIMEOUT_MS;
}
