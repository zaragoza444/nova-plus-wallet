import type { NovaBankSession, NovaBankUser } from "./nova-bank-api";

const ACCESS = "nova.bank.access.v1";
const REFRESH = "nova.bank.refresh.v1";
const PROFILE = "nova.bank.profile.v1";

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function saveNovaBankSession(session: NovaBankSession): void {
  const s = storage();
  if (!s) return;
  s.setItem(ACCESS, session.accessToken);
  s.setItem(REFRESH, session.refreshToken);
  s.setItem(PROFILE, JSON.stringify(session.user));
}

export function getNovaBankAccessToken(): string | null {
  return storage()?.getItem(ACCESS) ?? null;
}

export function getNovaBankRefreshToken(): string | null {
  return storage()?.getItem(REFRESH) ?? null;
}

export function getNovaBankProfile(): NovaBankUser | null {
  try {
    const raw = storage()?.getItem(PROFILE);
    return raw ? (JSON.parse(raw) as NovaBankUser) : null;
  } catch {
    return null;
  }
}

export function clearNovaBankSession(): void {
  const s = storage();
  if (!s) return;
  s.removeItem(ACCESS);
  s.removeItem(REFRESH);
  s.removeItem(PROFILE);
}
