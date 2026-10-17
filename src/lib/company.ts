import { NOVA_PRODUCT_CONTACT_EMAIL } from "./brand";
import { getChain } from "./chains";
import { paths, swapWithToken } from "./routes";

/** Live Nova AI Builder studio. */
export const NOVA_AI_BUILDER_URL = "https://nova-ai-builder-production.up.railway.app";

/** Public identity from the 10 June 2026 certificate and memorandum. */
export const company = {
  legalName: "NOVA TRUSTY TECHNOLOGIES LTD",
  displayName: "Nova Trusty Technologies Ltd",
  shortName: "Nova Trusty",
  number: "17272413",
  incorporated: "10 June 2026",
  jurisdiction: "England and Wales",
  type: "Private company limited by shares",
  subscriber: "Zardasht Waisi Hamad Amin",
  email: NOVA_PRODUCT_CONTACT_EMAIL,
  summary:
    "Technology company behind Nova+, Nova X, Nova Swap, Nova Bridge, and Nova AI Builder, on NovaONE and NRW.",
} as const;

export const companyProducts = [
  {
    name: "Nova+",
    body: "Self-custody wallet for the Nova mesh. Open it, then send, receive, and hold from the live wallet.",
    to: paths.plus,
    cta: "Open Nova+",
  },
  {
    name: "Nova X",
    body: "Member ledger for USD, EUR, and GBP, with swap, cards, and OneX Chain on the live Nova X screen.",
    to: paths.onex,
    cta: "Open Nova X",
  },
  {
    name: "Nova Swap",
    body: "Live exchange screen inside the wallet. An unlocked Nova+ wallet is required before a swap can run.",
    to: paths.swap,
    cta: "Open Nova Swap",
  },
  {
    name: "Nova Bridge",
    body: "Live bridge between NovaONE (22016) and NRW (33001). Lock or burn on the source chain; mesh relayers mint or release on the destination.",
    to: paths.bridge,
    cta: "Open Nova Bridge",
  },
  {
    name: "Nova AI Builder",
    body: "Live studio for building on the Nova stack. Opens the production Nova AI Builder.",
    href: NOVA_AI_BUILDER_URL,
    cta: "Open Nova AI Builder",
  },
] as const;

function meshChain(id: number) {
  const chain = getChain(id);
  if (!chain) throw new Error(`Chain ${id} is not in the wallet catalog`);
  return {
    id: chain.id,
    name: chain.name,
    symbol: chain.nativeCurrency.symbol,
    explorer: chain.blockExplorerUrls[0] ?? null,
    to: swapWithToken(chain.id, chain.nativeCurrency.symbol),
  };
}

/** NovaONE and NRW World, the two mesh chains. */
export const companyChains = [meshChain(22016), meshChain(33001)] as const;
