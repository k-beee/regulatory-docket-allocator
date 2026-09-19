import React, { useState } from 'react';
import { ContestationRecord, ChallengeType, SubmissionRecord } from '../types';
import { ShieldAlert, X, AlertTriangle, CheckCircle, Scale, Send, RefreshCw } from 'lucide-react';

interface ContestationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contestations: ContestationRecord[];
  submissions: SubmissionRecord[];
  onOpenContestation: (challengeType: ChallengeType, targetIds: string[]) => Promise<void>;
  onResolveContestation: (contestationId: number, outcome: string, reason: string) => Promise<void>;
  preselectedSubmission?: SubmissionRecord | null;
  isLoading: boolean;
}

export const ContestationDrawer: React.FC<ContestationDrawerProps> = ({
  isOpen,
  onClose,
  contestations,
  submissions,
  onOpenContestation,
  onResolveContestation,
  preselectedSubmission,
  isLoading
}) => {
  const [challengeType, setChallengeType] = useState<ChallengeType>('DUPLICATE_ASTROTURF');
  const [targetId, setTargetId] = useState<string>(preselectedSubmission ? preselectedSubmission.submission_id : '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update targetId if preselected changes
  React.useEffect(() => {
    if (preselectedSubmission) {
      setTargetId(preselectedSubmission.submission_id);
    }
  }, [preselectedSubmission]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId.trim()) {
      alert('Please specify a target submission ID to contest.');
      return;
    }

    try {
      setIsSubmitting(true);
      const targets = targetId.split(',').map(s => s.trim()).filter(Boolean);
      await onOpenContestation(challengeType, targets);
      alert('Contestation registered on-chain in the docket registry.');
    } catch (err: any) {
      alert(`Contestation submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickResolve = async (id: number, outcome: 'ACCEPT' | 'REJECT') => {
    const reason = outcome === 'ACCEPT'
      ? 'GenLayer Dragon Consensus verified astroturf template collision against canonical baseline.'
      : 'Arbitration panel determined submission exhibits distinct substantive methodologies under APA § 553.';
    try {
      await onResolveContestation(id, outcome, reason);
      alert(`Contestation #${id} resolved: ${outcome}`);
    } catch (err: any) {
      alert(`Resolution failed: ${err.message}`);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      maxWidth: '560px',
      background: 'var(--color-bg-panel)',
      borderLeft: '1px solid var(--color-border-medium)',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.6)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      animation: 'slideInRight 0.25s ease'
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--color-border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(14, 26, 47, 0.9)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: 'rgba(234, 179, 8, 0.15)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-accent-gold)'
          }}>
            <ShieldAlert size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Procedural Contestation Panel
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              5 U.S.C. § 706 Arbitrary & Capricious Review
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Notice Info Box */}
        <div style={{
          background: 'rgba(234, 179, 8, 0.06)',
          border: '1px solid rgba(234, 179, 8, 0.25)',
          borderRadius: '8px',
          padding: '0.85rem 1rem',
          fontSize: '0.78rem',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.45
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-accent-gold)', fontWeight: 600, marginBottom: '0.3rem' }}>
            <Scale size={14} /> APA Administrative Due Process
          </div>
          Stakeholders may challenge enrolled comments or allocated witnesses for astroturf replication or provenance mismatch. Resolving challenges invokes GenLayer non-deterministic LLM consensus arbitration and triggers deterministic sortition re-balance.
        </div>

        {/* Submit Contestation Form */}
        <form onSubmit={handleSubmit} style={{
          background: 'rgba(20, 34, 61, 0.4)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '8px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Register New Procedural Challenge
          </h4>

          <div>
            <label className="reg-label" style={{ display: 'block', marginBottom: '0.3rem' }}>
              Grounds for Challenge
            </label>
            <select
              className="reg-input"
              value={challengeType}
              onChange={(e) => setChallengeType(e.target.value as ChallengeType)}
              style={{ width: '100%', fontSize: '0.8rem' }}
            >
              <option value="DUPLICATE_ASTROTURF">Astroturf Duplicate (Substantively Identical Boilerplate)</option>
              <option value="PROVENANCE_MISMATCH">Provenance Mismatch (Digest / Admission Authority Breach)</option>
            </select>
          </div>

          <div>
            <label className="reg-label" style={{ display: 'block', marginBottom: '0.3rem' }}>
              Target Submission ID(s)
            </label>
            <input
              type="text"
              placeholder="e.g. EPA-SUB-005 (or EPA-SUB-003, EPA-SUB-005 for duplicates)"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="reg-input"
              style={{ width: '100%', fontSize: '0.8rem' }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', display: 'block' }}>
              Specify 1 submission ID for Provenance Mismatch, or 2 comma-separated IDs for Duplicate Astroturf.
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="reg-btn reg-btn-primary"
            style={{ width: '100%', marginTop: '0.4rem', justifyContent: 'center' }}
          >
            <Send size={14} />
            {isSubmitting ? 'Submitting Contestation...' : 'File Procedural Challenge'}
          </button>
        </form>

        {/* Existing Contestations List */}
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
            Registered Challenges ({contestations.length})
          </h4>

          {contestations.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>
              No active or historical procedural challenges on this docket.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {contestations.map((c) => {
                const isPending = c.status === 'PENDING';
                const isAccepted = c.status === 'ACCEPTED';
                const isRejected = c.status === 'REJECTED';

                let statusBadge = (
                  <span className="reg-badge reg-badge-pending" style={{ fontSize: '0.65rem' }}>
                    PENDING ARBITRATION
                  </span>
                );
                if (isAccepted) {
                  statusBadge = (
                    <span className="reg-badge reg-badge-annulled" style={{ fontSize: '0.65rem' }}>
                      ACCEPTED // DISQUALIFIED
                    </span>
                  );
                } else if (isRejected) {
                  statusBadge = (
                    <span className="reg-badge reg-badge-active" style={{ fontSize: '0.65rem' }}>
                      DISMISSED // SUSTAINED
                    </span>
                  );
                }

                return (
                  <div
                    key={c.id}
                    style={{
                      background: 'rgba(20, 34, 61, 0.3)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent-gold)', fontWeight: 600 }}>
                        DISPUTE #{c.id}: {c.challenge_type}
                      </span>
                      {statusBadge}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      Target(s): <strong style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{c.target_ids.join(', ')}</strong>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Challenger: {c.challenger.slice(0, 10)}...{c.challenger.slice(-4)}
                    </div>

                    {c.resolution_reason && (
                      <div style={{ fontSize: '0.75rem', color: isAccepted ? 'var(--color-accent-ruby)' : 'var(--color-accent-teal)', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
                        Arbitration Finding: {c.resolution_reason}
                      </div>
                    )}

                    {isPending && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                        <button
                          onClick={() => handleQuickResolve(c.id, 'ACCEPT')}
                          disabled={isLoading}
                          className="reg-btn reg-btn-danger"
                          style={{ flex: 1, fontSize: '0.72rem', padding: '0.3rem' }}
                        >
                          Uphold (Disqualify Target)
                        </button>
                        <button
                          onClick={() => handleQuickResolve(c.id, 'REJECT')}
                          disabled={isLoading}
                          className="reg-btn reg-btn-outline"
                          style={{ flex: 1, fontSize: '0.72rem', padding: '0.3rem' }}
                        >
                          Dismiss (Reject Challenge)
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
