# Signet wallet-generation patch — apply notes

Files in this patch (drop over the repo root, preserving paths):
  package.json                     fixed scripts + tailwind/postcss/autoprefixer
  postcss.config.js                NEW — makes @tailwind directives actually compile
  src/lib/keystore.ts              NEW — ethers v6 key gen / encrypt / unlock
  src/lib/chains.ts                NEW — real chain registry
  src/context/WalletContext.tsx    REPLACED — keystore-backed, backward compatible
  src/pages/OnboardingPage.tsx     REPLACED — real create + seed reveal + password
  src/pages/ImportWalletPage.tsx   REPLACED — real import
  src/pages/Locked.tsx             REPLACED — real unlock
  src/App.tsx                      REPLACED — adds RequireWallet route guard

What works after this: create a wallet (real seed), set a password, unlock/lock,
import a phrase/key. The guard sends /app -> /onboarding (no wallet) or /locked.

Still mock until the NEXT patch: token balances + the portfolio total
(useTokenBalances/useChainData still return mock data) and send (useTokenTransfer).
Those get wired to the registry's RPCs next.
