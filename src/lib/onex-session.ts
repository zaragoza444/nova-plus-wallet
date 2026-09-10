import type { OnexSession } from "./onex-api";

const ACCESS = "onex.bank.access.v1";
const REFRESH = "onex.bank.refresh.v1";
const PROFILE = "onex.bank.profile.v1";

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function saveOnexSession(session: OnexSession): void {
  const s = storage();
  if (!s) return;
  s.setItem(ACCESS, session.accessToken);
  s.setItem(REFRESH, session.refreshToken);
  s.setItem(PROFILE, JSON.stringify(session.user));
}

export function getOnexAccessToken(): string | null {
  return storage()?.getItem(ACCESS) ?? null;
}

export function getOnexRefreshToken(): string | null {
  return storage()?.getItem(REFRESH) ?? null;
}

export function getOnexProfile(): OnexSession["user"] | null {
  try {
    const raw = storage()?.getItem(PROFILE);
    return raw ? (JSON.parse(raw) as OnexSession["user"]) : null;
  } catch {
    return null;
  }
}

export function clearOnexSession(): void {
  const s = storage();
  if (!s) return;
  s.removeItem(ACCESS);
  s.removeItem(REFRESH);
  s.removeItem(PROFILE);
}
