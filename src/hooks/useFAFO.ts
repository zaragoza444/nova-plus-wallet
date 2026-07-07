import { useState, useEffect } from "react";

interface FAFOStatus {
  label: string;
  active: boolean;
}

const MOCK_STATUSES: FAFOStatus[] = [
  { label: "Cool-down period", active: false },
  { label: "Daily limit", active: false },
  { label: "Cross-chain cap", active: false },
];

export function useFAFO(
  address: string | undefined,
  pollInterval: number,
): {
  anyEnforced: boolean;
  statuses: FAFOStatus[];
  loading: boolean;
  error: any;
} {
  const [statuses, setStatuses] = useState<FAFOStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!address) {
      setStatuses([]);
      setLoading(false);
      setError(null);
      return;
    }

    let mounted = true;
    const fetch = () => {
      setLoading(true);
      setError(null);
      setTimeout(() => {
        if (!mounted) return;
        setStatuses(MOCK_STATUSES);
        setLoading(false);
      }, 300);
    };
    fetch();
    const interval = setInterval(fetch, pollInterval);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [address, pollInterval]);

  const anyEnforced = statuses.some((s) => s.active);

  return { anyEnforced, statuses, loading, error };
}
