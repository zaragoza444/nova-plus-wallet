import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWalletContext } from "../../context/WalletContext";
import { getAutoLockMs, subscribeSettingsChanged } from "../../lib/settings";
import { persistUnlockActivity } from "../../lib/unlockSession";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"] as const;

export function AutoLockMonitor(): JSX.Element {
  const { status, lock } = useWalletContext();
  const navigate = useNavigate();
  const location = useLocation();
  const timerRef = useRef<number | null>(null);
  const timeoutMsRef = useRef(getAutoLockMs());

  useEffect(() => {
    const syncTimeout = () => {
      timeoutMsRef.current = getAutoLockMs();
    };
    syncTimeout();
    return subscribeSettingsChanged(syncTimeout);
  }, []);

  useEffect(() => {
    if (status !== "unlocked") {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const schedule = () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      const ms = timeoutMsRef.current;
      if (ms <= 0) {
        timerRef.current = null;
        return;
      }
      timerRef.current = window.setTimeout(() => {
        lock();
        if (!location.pathname.startsWith("/locked")) {
          navigate("/locked", { replace: true, state: { from: location.pathname } });
        }
      }, ms);
    };

    const onActivity = () => {
      persistUnlockActivity();
      schedule();
    };

    schedule();
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onActivity);

    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onActivity);
      }
      document.removeEventListener("visibilitychange", onActivity);
    };
  }, [status, lock, navigate, location.pathname]);

  return <></>;
}
