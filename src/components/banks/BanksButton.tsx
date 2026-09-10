import { Link } from "react-router-dom";
import { useWalletContext } from "../../context/WalletContext";
import { paths } from "../../lib/routes";

export function BanksButton(): JSX.Element | null {
  const { isInstitutional, gateUnlocked } = useWalletContext();

  return (
    <Link
      to={isInstitutional ? paths.banks : paths.onex}
      className={`fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-4 right-4 z-30 mx-auto flex max-w-lg min-h-[48px] items-center justify-center rounded-xl text-sm font-semibold text-white shadow-burgundy-md transition md:bottom-6 md:left-auto md:right-6 md:max-w-xs ${
        !isInstitutional || gateUnlocked
          ? "bg-signet-burgundy hover:bg-signet-burgundy-bright"
          : "bg-signet-burgundy/60 hover:bg-signet-burgundy/70"
      }`}
      title={!isInstitutional ? "Open OneX Online Bank" : gateUnlocked ? "Open Banks directory" : "OneX Bank is live — other banks need the institutional gate"}
    >
      {!isInstitutional ? "OneX Bank" : gateUnlocked ? "Banks" : "Banks — OneX live"}
    </Link>
  );
}
