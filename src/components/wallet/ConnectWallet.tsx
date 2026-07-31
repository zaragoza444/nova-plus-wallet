import { useWalletContext } from "../../context/WalletContext";

export function ConnectWallet({ children }: { children?: React.ReactNode }): JSX.Element {
  const { wallet, connect, disconnect } = useWalletContext();
  if (wallet.isConnected) {
    return (
      <div className="glass" style={{ padding: 16, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Connected</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, wordBreak: "break-all", marginBottom: 12 }}>
          {wallet.address}
        </div>
        <button className="btn-secondary" onClick={disconnect} style={{ minHeight: 36, fontSize: 12 }}>
          Disconnect
        </button>
        {children}
      </div>
    );
  }
  return (
    <div className="glass" style={{ padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
      <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Connect Wallet</h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
        Enter your wallet address to get started
      </p>
      <input
        type="text"
        placeholder="0x..."
        style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 13, width: "100%", fontFamily: "var(--font-mono)", marginBottom: 12 }}
        onKeyDown={(e) => { if (e.key === "Enter") connect(); }}
      />
      <button className="btn-primary" style={{ width: "100%" }} onClick={connect}>
        Connect
      </button>
    </div>
  );
}
