export const paths = {
  home: "/app",
  tokens: "/app/tokens",
  assets: "/app/assets",
  bridge: "/app/bridge",
  send: "/app/send",
  receive: "/app/receive",
  swap: "/app/swap",
  more: "/app/more",
  importWallet: "/app/import-wallet",
  settings: "/app/settings",
  settingsAccounts: "/app/settings/accounts",
  settingsGeneral: "/app/settings/general",
  settingsSecurity: "/app/settings/security",
  settingsBackup: "/app/settings/backup",
  settingsNetwork: "/app/settings/network",
  settingsNotifications: "/app/settings/notifications",
  settingsDisplay: "/app/settings/display",
  settingsConnections: "/app/settings/connections",
  settingsAdvanced: "/app/settings/advanced",
  settingsFafo: "/app/settings/fafo",
  settingsAbout: "/app/settings/about",
  banks: "/app/banks",
};
export function assetDetail(chainId: number, symbol: string): string {
  return `/app/assets/${chainId}/${encodeURIComponent(symbol)}`;
}
export function tokenChart(coingeckoId: string): string {
  return `/app/tokens/chart/${encodeURIComponent(coingeckoId)}`;
}
export function sendWithToken(chainId: number, symbol: string): string {
  return `${paths.send}?chainId=${chainId}&symbol=${encodeURIComponent(symbol)}`;
}
export function receiveOnChain(chainId: number): string {
  return `${paths.receive}?chainId=${chainId}`;
}
export function swapWithToken(chainId: number, symbol: string, tokenAddress?: string): string {
  const q = new URLSearchParams({ chainId: String(chainId), symbol });
  if (tokenAddress) q.set("token", tokenAddress);
  return `${paths.swap}?${q.toString()}`;
}
