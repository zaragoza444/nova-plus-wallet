import { useEffect, useState } from "react";
import { getPrefs, subscribePrefsChanged, type SignetPrefs } from "../lib/prefs";
import { getSettings, subscribeSettingsChanged, type DisplayCurrency } from "../lib/settings";

/** Display currency from settings + visibility prefs from signet.prefs.v1. */
export function useDisplaySettings(): SignetPrefs & { displayCurrency: DisplayCurrency } {
  const [prefs, setPrefs] = useState<SignetPrefs>(() => getPrefs());
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>(
    () => getSettings().displayCurrency,
  );

  useEffect(() => subscribePrefsChanged(() => setPrefs(getPrefs())), []);
  useEffect(() => subscribeSettingsChanged(() => setDisplayCurrency(getSettings().displayCurrency)), []);

  return { ...prefs, displayCurrency };
}

export function usePrefs(): SignetPrefs {
  const [prefs, setPrefs] = useState<SignetPrefs>(() => getPrefs());
  useEffect(() => subscribePrefsChanged(() => setPrefs(getPrefs())), []);
  return prefs;
}
