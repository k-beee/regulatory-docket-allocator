import React, { useState, useEffect } from 'react';
import { WalletManager } from '../wallet';
import { WalletProviderDetail } from '../types';
import { NETWORK_CONFIG } from '../config';
import { Scale, Wallet, ChevronDown, ExternalLink } from 'lucide-react';

interface MastheadProps {
  contractAddress: string;
  connectedAccount: string | null;
  onConnectAccount: (account: string, provider: any) => void;
  onDisconnectAccount: () => void;
}

export const Masthead: React.FC<MastheadProps> = ({
  contractAddress,
  connectedAccount,
  onConnectAccount,
  onDisconnectAccount,
}) => {
  const [providers, setProviders] = useState<WalletProviderDetail[]>([]);
  const [showWalletMenu, setShowWalletMenu] = useState<boolean>(false);
  const walletMgr = WalletManager.getInstance();

  useEffect(() => {
    const unsub = walletMgr.subscribe((list) => setProviders(list));
    return () => unsub();
  }, []);

  const handleSelectProvider = async (detail: WalletProviderDetail) => {
    try {
      const account = await walletMgr.connect(detail.provider);
      onConnectAccount(account, detail.provider);
      setShowWalletMenu(false);
    } catch (err: any) {
      alert(`Wallet connection failed: ${err.message}`);
    }
  };

  return (
    <header className="reg-card" style={{ borderBottom: '1px solid var(--color-border-subtle)', borderRadius: 0, padding: '1rem 2rem' }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Brand & Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(14, 165, 233, 0.4)'
          }}>
            <Scale size={22} color="#060d1a" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#f8fafc' }}>
                REGULATORY DOCKET ALLOCATOR
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>APA Rulemaking</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              Federal Notice-and-Comment Sortition & Anti-Astroturfing Consensus Engine
            </p>
          </div>
        </div>

        {/* Network & Wallet Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-subtle)',
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0ea5e9', boxShadow: '0 0 8px #0ea5e9' }}></span>
            <span style={{ color: 'var(--color-text-secondary)' }}>Chain {NETWORK_CONFIG.chainId}</span>
            <span style={{ color: '#fff', fontWeight: 600 }}>{NETWORK_CONFIG.chainName}</span>
          </div>

          {/* Live Network & Consensus Engine Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(14, 165, 233, 0.12)',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0ea5e9', boxShadow: '0 0 8px #0ea5e9' }}></span>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>Live Studionet (GenVM)</span>
          </div>

          <div style={{ position: 'relative' }}>
            {connectedAccount ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  className="btn-secondary"
                  onClick={() => setShowWalletMenu(!showWalletMenu)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2dd4bf' }}></span>
                  <span className="mono-hash">{WalletManager.truncateAddress(connectedAccount)}</span>
                  <ChevronDown size={14} />
                </button>
                {showWalletMenu && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '110%',
                    width: '200px',
                    background: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border-prominent)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '0.5rem',
                    zIndex: 50,
                  }}>
                    <button
                      onClick={() => {
                        onDisconnectAccount();
                        setShowWalletMenu(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.5rem 0.75rem',
                        background: 'transparent',
                        border: 'none',
                        color: '#fb7185',
                        cursor: 'pointer',
                        fontSize: '0.825rem',
                        borderRadius: '4px',
                      }}
                    >
                      Disconnect Wallet
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <button
                  className="btn-primary"
                  onClick={() => setShowWalletMenu(!showWalletMenu)}
                >
                  <Wallet size={16} />
                  <span>Connect Wallet</span>
                  <ChevronDown size={14} />
                </button>

                {showWalletMenu && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '110%',
                    width: '240px',
                    background: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border-prominent)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '0.75rem',
                    zIndex: 50,
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                      EIP-6963 INJECTED WALLETS
                    </div>
                    {providers.length > 0 ? (
                      providers.map((p) => (
                        <button
                          key={p.info.uuid}
                          onClick={() => handleSelectProvider(p)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            padding: '0.55rem',
                            background: 'var(--color-bg-surface)',
                            border: '1px solid var(--color-border-subtle)',
                            color: '#fff',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginBottom: '0.35rem',
                            fontSize: '0.825rem',
                          }}
                        >
                          {p.info.icon && (
                            <img src={p.info.icon} alt={p.info.name} style={{ width: '18px', height: '18px' }} />
                          )}
                          <span>{p.info.name}</span>
                        </button>
                      ))
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', padding: '0.5rem 0' }}>
                        No EIP-6963 wallets detected. Please connect MetaMask or Studionet wallet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
