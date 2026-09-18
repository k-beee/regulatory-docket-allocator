import React from 'react';
import { DocketSummary, LifecycleState } from '../types';
import { Lock, FileText, Sparkles, UserCheck, ShieldAlert, CheckCircle, Flame, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

interface DocketHeroProps {
  docket: DocketSummary | null;
  isLoading: boolean;
  onRefresh: () => void;
  onLockManifest: () => void;
  onClusterSubmissions: () => void;
  onAllocateWitnesses: () => void;
  onRatifyDocket: () => void;
  onAnnulDocket: () => void;
  onOpenContestationDrawer: () => void;
  onOpenAuditBundle: () => void;
  isSimulated: boolean;
}

export const DocketHero: React.FC<DocketHeroProps> = ({
  docket,
  isLoading,
  onRefresh,
  onLockManifest,
  onClusterSubmissions,
  onAllocateWitnesses,
  onRatifyDocket,
  onAnnulDocket,
  onOpenContestationDrawer,
  onOpenAuditBundle,
  isSimulated
}) => {
  if (!docket) {
    return (
      <div className="reg-card" style={{ padding: '2.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading regulatory docket details...</p>
      </div>
    );
  }

  const {
    docket_id,
    organizer,
    admission_authority,
    proposal_url,
    expected_manifest_digest,
    computed_manifest_digest,
    slot_count,
    state,
    submission_count,
    revision,
    accepted_contestation_count,
    pending_contestation_count
  } = docket;

  const isEnrolling = state === 'ENROLLING';
  const isLocked = state === 'MANIFEST_LOCKED';
  const isClustered = state === 'IMPACT_CONSENSUS';
  const isAllocated = state === 'WITNESSES_ALLOCATED' || state === 'CONTESTATION_OPEN';
  const isRatified = state === 'SOVEREIGN_RATIFIED';
  const isAnnulled = state === 'ANNULLED_PRELOCK';

  return (
    <div className="reg-card" style={{ marginBottom: '1.5rem', padding: '1.75rem 2rem', position: 'relative' }}>
      {/* Top Meta Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="reg-label">RULEMAKING DOCKET #0{docket_id}</span>
          <span style={{ color: 'var(--color-border-subtle)' }}>•</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
            REV-{revision}
          </span>
          {isSimulated && (
            <span style={{
              fontSize: '0.7rem',
              background: 'rgba(234, 179, 8, 0.15)',
              color: 'var(--color-accent-gold)',
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              fontFamily: 'var(--font-mono)'
            }}>
              SIMULATION HARNESS ACTIVE
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="reg-btn reg-btn-outline"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh docket state"
            style={{ padding: '0.35rem 0.65rem' }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin-icon' : ''} />
          </button>
          <button
            className="reg-btn reg-btn-outline"
            onClick={onOpenAuditBundle}
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}
          >
            <FileText size={14} />
            APA Audit Bundle
          </button>
        </div>
      </div>

      {/* Main Title & NPRM Citation */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.4rem', letterSpacing: '-0.01em' }}>
          National Ambient Air Quality Standards: Heavy Vehicle PM2.5 Rulemaking
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          <span>Agency: <strong style={{ color: 'var(--color-text-primary)' }}>U.S. EPA / Fed. Reg. Docket EPA-HQ-OAR-2026-0188</strong></span>
          <span>•</span>
          <span>Authority: <code style={{ color: 'var(--color-accent-teal)' }}>{admission_authority.slice(0, 10)}...{admission_authority.slice(-6)}</code></span>
          <span>•</span>
          <a
            href={proposal_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-accent-cyan)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
          >
            Federal Register Notice (NPRM) <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div className="reg-stat-tile">
          <div className="reg-stat-label">Enrolled Submissions</div>
          <div className="reg-stat-val" style={{ color: 'var(--color-text-primary)' }}>{submission_count}</div>
          <div className="reg-stat-sub">Administrative record comments</div>
        </div>

        <div className="reg-stat-tile">
          <div className="reg-stat-label">Hearing Seats</div>
          <div className="reg-stat-val" style={{ color: 'var(--color-accent-cyan)' }}>{slot_count}</div>
          <div className="reg-stat-sub">Balanced witness sortition quota</div>
        </div>

        <div className="reg-stat-tile">
          <div className="reg-stat-label">Contestations</div>
          <div className="reg-stat-val" style={{ color: pending_contestation_count > 0 ? 'var(--color-accent-gold)' : 'var(--color-accent-teal)' }}>
            {pending_contestation_count} <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>({accepted_contestation_count} accepted)</span>
          </div>
          <div className="reg-stat-sub">Astroturf / provenance disputes</div>
        </div>

        <div className="reg-stat-tile">
          <div className="reg-stat-label">Manifest Digest</div>
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent-teal)', marginTop: '0.5rem', wordBreak: 'break-all' }}>
            {expected_manifest_digest ? `${expected_manifest_digest.slice(0, 16)}...` : 'Pending Lock'}
          </div>
          <div className="reg-stat-sub">SHA-256 canonical seal</div>
        </div>
      </div>

      {/* Primary Procedural Actions Ribbon */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        paddingTop: '1rem',
        borderTop: '1px solid var(--color-border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {isEnrolling && (
            <>
              <button
                className="reg-btn reg-btn-primary"
                onClick={onLockManifest}
                disabled={isLoading}
              >
                <Lock size={15} /> Lock Manifest (Freeze Docket)
              </button>
              <button
                className="reg-btn reg-btn-danger"
                onClick={onAnnulDocket}
                disabled={isLoading}
                style={{ fontSize: '0.8rem' }}
              >
                <AlertCircle size={14} /> Annul Docket (Pre-Lock)
              </button>
            </>
          )}

          {isLocked && (
            <button
              className="reg-btn reg-btn-primary"
              onClick={onClusterSubmissions}
              disabled={isLoading}
            >
              <Sparkles size={15} /> Run Non-Deterministic Impact Consensus
            </button>
          )}

          {isClustered && (
            <button
              className="reg-btn reg-btn-primary"
              onClick={onAllocateWitnesses}
              disabled={isLoading}
            >
              <UserCheck size={15} /> Allocate Hearing Witnesses (Sortition)
            </button>
          )}

          {isAllocated && (
            <>
              <button
                className="reg-btn reg-btn-primary"
                onClick={onRatifyDocket}
                disabled={isLoading}
              >
                <CheckCircle size={15} /> Ratify Docket (Sovereign Finality)
              </button>
              <button
                className="reg-btn reg-btn-outline"
                onClick={onOpenContestationDrawer}
                style={{ borderColor: 'rgba(234, 179, 8, 0.4)', color: 'var(--color-accent-gold)' }}
              >
                <ShieldAlert size={15} /> Dispute & Arbitration Panel
              </button>
            </>
          )}

          {isRatified && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-accent-teal)', fontSize: '0.9rem', fontWeight: 600 }}>
              <CheckCircle size={18} /> APA Notice & Comment Record Finalized. Sovereign Ratification Complete.
            </div>
          )}

          {isAnnulled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-accent-ruby)', fontSize: '0.9rem', fontWeight: 600 }}>
              <AlertCircle size={18} /> Docket Annulled Prior to Manifest Lock. No Further Actions Permitted.
            </div>
          )}
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          5 U.S.C. § 706 Non-Arbitrary Rationality Guarantee
        </div>
      </div>
    </div>
  );
};
