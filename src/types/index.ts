export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  address?: string;
}

export interface TokenBalanceRow {
  token: TokenInfo;
  chainId: number;
  chainName: string;
  balance: string;
  formatted: string;
  usdEstimate: number | null;
}

// Added for SwapPage / multi-chain typing.
export type ChainId = number;

export interface TokenConfig {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  standard: "native" | "erc20" | string;
}
