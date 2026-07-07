// Signet — local activity log (sent txs). Never stores keys or secrets.
const ACTIVITY_KEY = "signet.activity.v1";
const MAX_RECORDS = 200;

export interface ActivityRecord {
  id: string;
  type: "send";
  hash: string;
  chainId: number;
  chainName: string;
  symbol: string;
  amount: string;
  to: string;
  timestamp: number;
  explorerUrl: string | null;
}

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function getActivityRecords(): ActivityRecord[] {
  const s = storage();
  if (!s) return [];
  try {
    const raw = s.getItem(ACTIVITY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ActivityRecord[]) : [];
  } catch {
    return [];
  }
}

export function getActivityForToken(chainId: number, symbol: string): ActivityRecord[] {
  const upper = symbol.toUpperCase();
  return getActivityRecords().filter(
    (r) => r.chainId === chainId && r.symbol.toUpperCase() === upper,
  );
}

export function appendActivityRecord(record: Omit<ActivityRecord, "id" | "timestamp">): ActivityRecord {
  const entry: ActivityRecord = {
    ...record,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
  };
  const s = storage();
  if (s) {
    const next = [entry, ...getActivityRecords()].slice(0, MAX_RECORDS);
    s.setItem(ACTIVITY_KEY, JSON.stringify(next));
  }
  return entry;
}
