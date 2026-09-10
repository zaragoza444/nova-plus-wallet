import { HashRouter, Navigate, Outlet, Route, Routes, useParams } from "react-router-dom";
import { WalletProvider, useWalletContext } from "./context/WalletContext";
import { ToastProvider } from "./context/ToastContext";
import { Header } from "./components/layout/Header";
import { MobileNav } from "./components/layout/MobileNav";
import { ToastViewport } from "./components/common/ToastViewport";
import { paths, assetDetail } from "./lib/routes";
import { LandingPage } from "./pages/LandingPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { Dashboard } from "./pages/Dashboard";
import { Tokens } from "./pages/Tokens";
import { TokenChartPage } from "./pages/TokenChartPage";
import { Assets } from "./pages/Assets";
import { Bridge } from "./pages/Bridge";
import { SettingsLayout } from "./pages/settings/SettingsLayout";
import { SettingsIndexRedirect } from "./pages/settings/SettingsIndexRedirect";
import { SettingsAccountsPage } from "./pages/settings/SettingsAccountsPage";
import { SettingsSecurityPage } from "./pages/settings/SettingsSecurityPage";
import { SettingsBackupPage } from "./pages/settings/SettingsBackupPage";
import { SettingsNetworkPage } from "./pages/settings/SettingsNetworkPage";
import { SettingsNotificationsPage } from "./pages/settings/SettingsNotificationsPage";
import { SettingsDisplayPage } from "./pages/settings/SettingsDisplayPage";
import { SettingsConnectionsPage } from "./pages/settings/SettingsConnectionsPage";
import { SettingsAdvancedPage } from "./pages/settings/SettingsAdvancedPage";
import { SettingsFafoPage } from "./pages/settings/SettingsFafoPage";
import { SettingsAboutPage } from "./pages/settings/SettingsAboutPage";
import { SettingsGeneralPage } from "./pages/settings/SettingsGeneralPage";
import { LockedPage } from "./pages/Locked";
import { AssetDetail } from "./components/assets/AssetDetail";
import { AutoLockMonitor } from "./components/security/AutoLockMonitor";
import { OfflineBanner } from "./components/layout/OfflineBanner";
import { SendPage } from "./pages/SendPage";
import { ReceivePage } from "./pages/ReceivePage";
import { SwapPage } from "./pages/SwapPage";
import { MorePage } from "./pages/MorePage";
import { ImportWalletPage } from "./pages/ImportWalletPage";
import { BanksDirectory } from "./pages/BanksDirectory";
import { BanksButton } from "./components/banks/BanksButton";
import { OnexBankProvider } from "./context/OnexBankContext";
import { OnexLandingPage } from "./pages/onex/OnexLandingPage";
import { OnexLoginPage } from "./pages/onex/OnexLoginPage";
import { OnexAppLayout } from "./pages/onex/OnexAppLayout";
import { OnexDashboardPage } from "./pages/onex/OnexDashboardPage";
import { OnexTransferPage } from "./pages/onex/OnexTransferPage";
import { OnexSwapPage } from "./pages/onex/OnexSwapPage";
import { OnexChainPage } from "./pages/onex/OnexChainPage";
import { OnexCardsPage } from "./pages/onex/OnexCardsPage";

function LegacyAssetDetailRedirect(): JSX.Element {
  const { chainId, symbol } = useParams();
  return <Navigate to={assetDetail(Number(chainId), symbol ?? "")} replace />;
}

function LegacySettingsRedirect(): JSX.Element {
  const { rest } = useParams();
  return <Navigate to={`${paths.settings}/${rest ?? "accounts"}`} replace />;
}

// Gate every /app route on a real, unlocked wallet.
function RequireWallet({ children }: { children: JSX.Element }): JSX.Element {
  const { status } = useWalletContext();
  if (status === "no-wallet" || status === "watch-only") return <Navigate to="/onboarding" replace />;
  if (status === "locked") return <Navigate to="/locked" replace />;
  return children;
}

function Shell(): JSX.Element {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-signet-bg">
      <OfflineBanner />
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-[calc(80px+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] md:px-6 md:pb-6 md:pt-6">
        <Outlet />
      </main>
      <MobileNav />
      <BanksButton />
      <ToastViewport />
    </div>
  );
}

export default function App(): JSX.Element {
  return (
    <WalletProvider>
      <ToastProvider>
        <OnexBankProvider>
        <HashRouter>
          <>
            <AutoLockMonitor />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/onex" element={<OnexLandingPage />} />
              <Route path="/onex/login" element={<OnexLoginPage />} />
              <Route path="/onex/app" element={<OnexAppLayout />}>
                <Route index element={<OnexDashboardPage />} />
                <Route path="transfer" element={<OnexTransferPage />} />
                <Route path="swap" element={<OnexSwapPage />} />
                <Route path="chain" element={<OnexChainPage />} />
                <Route path="cards" element={<OnexCardsPage />} />
              </Route>
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/locked" element={<LockedPage />} />
              <Route path="/app/import-wallet" element={<ImportWalletPage />} />
              <Route path="/tokens" element={<Navigate to={paths.tokens} replace />} />
              <Route path="/assets" element={<Navigate to={paths.assets} replace />} />
              <Route path="/assets/:chainId/:symbol" element={<LegacyAssetDetailRedirect />} />
              <Route path="/bridge" element={<Navigate to={paths.bridge} replace />} />
              <Route path="/settings" element={<Navigate to={paths.settingsAccounts} replace />} />
              <Route path="/settings/:rest" element={<LegacySettingsRedirect />} />
              <Route path="/app" element={<RequireWallet><Shell /></RequireWallet>}>
                <Route index element={<Dashboard />} />
                <Route path="send" element={<SendPage />} />
                <Route path="receive" element={<ReceivePage />} />
                <Route path="swap" element={<SwapPage />} />
                <Route path="more" element={<MorePage />} />
                <Route path="tokens/chart/:coingeckoId" element={<TokenChartPage />} />
                <Route path="tokens" element={<Tokens />} />
                <Route path="assets" element={<Assets />} />
                <Route path="assets/:chainId/:symbol" element={<AssetDetail />} />
                <Route path="bridge" element={<Bridge />} />
                <Route path="banks" element={<BanksDirectory />} />
                <Route path="settings" element={<SettingsLayout />}>
                  <Route index element={<SettingsIndexRedirect />} />
                  <Route path="accounts" element={<SettingsAccountsPage />} />
                  <Route path="general" element={<SettingsGeneralPage />} />
                  <Route path="security" element={<SettingsSecurityPage />} />
                  <Route path="backup" element={<SettingsBackupPage />} />
                  <Route path="network" element={<SettingsNetworkPage />} />
                  <Route path="notifications" element={<SettingsNotificationsPage />} />
                  <Route path="display" element={<SettingsDisplayPage />} />
                  <Route path="connections" element={<SettingsConnectionsPage />} />
                  <Route path="advanced" element={<SettingsAdvancedPage />} />
                  <Route path="fafo" element={<SettingsFafoPage />} />
                  <Route path="about" element={<SettingsAboutPage />} />
                </Route>
                <Route path="*" element={<Navigate to={paths.home} replace />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </>
        </HashRouter>
        </OnexBankProvider>
      </ToastProvider>
    </WalletProvider>
  );
}
