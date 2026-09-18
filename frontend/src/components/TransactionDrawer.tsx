import React from 'react';
import { Terminal, X, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export interface TxLogEntry {
  id: string;
  timestamp: string;
  method: string;
  status: 'PENDING' | 'SUCCESS' | 'ERROR';
  hash?: string;
  detail?: string;
  executionMode: 'STUDIONET_RPC' | 'SIMULATION_VM';
}

interface TransactionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: TxLogEntry[];
  onClearLogs: () => void;
}

export const TransactionDrawer: React.FC<TransactionDrawerProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '320px',
      background: 'var(--color-bg-panel)',
      borderTop: '1px solid var(--color-border-medium)',
      boxShadow: '0 -10px 30px rgba(0,0,0,0.6)',
      zIndex: 999,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideUp 0.25s ease'
    }}>
      {/* Header */}
      <div style={{
        padding: '0.65rem 1.5rem',
        borderBottom: '1px solid var(--color-border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(14, 26, 47, 0.95)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Terminal size={16} color="var(--color-accent-teal)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            GenLayer Transaction & Consensus Inspector
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            ({logs.length} transactions recorded)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={onClearLogs}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}
          >
            Clear Log
          </button>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Log Output Area */}
      <div style={{
        padding: '1rem 1.5rem',
        overflowY: 'auto',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        background: 'var(--color-bg-base)'
      }}>
        {logs.length === 0 ? (
          <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
            No consensus transactions recorded yet. Trigger an administrative action to inspect RPC packets.
          </div>
        ) : (
          logs.map((log) => {
            const isPending = log.status === 'PENDING';
            const isSuccess = log.status === 'SUCCESS';
            const isError = log.status === 'ERROR';

            return (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '4px',
                  background: 'rgba(20, 34, 61, 0.3)',
                  borderLeft: `3px solid ${isSuccess ? 'var(--color-accent-teal)' : isError ? 'var(--color-accent-ruby)' : 'var(--color-accent-gold)'}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {isPending && <Clock size={14} color="var(--color-accent-gold)" />}
                  {isSuccess && <CheckCircle2 size={14} color="var(--color-accent-teal)" />}
                  {isError && <AlertCircle size={14} color="var(--color-accent-ruby)" />}

                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                    [{log.timestamp}]
                  </span>

                  <span style={{ color: 'var(--color-accent-cyan)', fontWeight: 600 }}>
                    {log.method}
                  </span>

                  {log.detail && (
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.72rem' }}>
                      — {log.detail}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.7rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    {log.executionMode}
                  </span>
                  {log.hash && (
                    <span style={{ color: 'var(--color-accent-teal)' }}>
                      tx: {log.hash.slice(0, 10)}...
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
